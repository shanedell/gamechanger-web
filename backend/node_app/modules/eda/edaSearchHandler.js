const SearchUtility = require('../../utils/searchUtility');
const EDASearchUtility = require('./edaSearchUtility');
const CONSTANTS = require('../../config/constants');
const { MLApiClient } = require('../../lib/mlApiClient');
const { DataLibrary } = require('../../lib/dataLibrary');

const SearchHandler = require('../base/searchHandler');
const { getUserIdFromSAMLUserId } = require('../../utils/userUtility');

class EdaSearchHandler extends SearchHandler {
	constructor(opts = {}) {
		const {
			dataLibrary = new DataLibrary(opts),
			edaSearchUtility = new EDASearchUtility(opts),
			constants = CONSTANTS,
			mlApi = new MLApiClient(opts),
			searchUtility = new SearchUtility(opts),
			// thesaurus = new Thesaurus(),
			// sep_async_redis = separatedRedisAsyncClient,
			// async_redis = redisAsyncClient
		} = opts;
		super({ ...opts }); //redisClientDB: redisAsyncClientDB,
		this.dataLibrary = dataLibrary;
		this.edaSearchUtility = edaSearchUtility;
		this.constants = constants;
		this.mlApi = mlApi;
		this.searchUtility = searchUtility;
	}

	async searchHelper(req, userId, storeHistory) {
		const historyRec = {
			user_id: getUserIdFromSAMLUserId(req),
			clone_name: undefined,
			search: '',
			startTime: new Date().toISOString(),
			numResults: -1,
			endTime: null,
			hadError: false,
			tiny_url: '',
			cachedResult: false,
			search_version: 1,
			request_body: {},
		};

		const {
			searchText,
			searchVersion,
			cloneName,
			offset,
			showTutorial = false,
			tiny_url,
			forCacheReload = false,
		} = req.body;

		try {
			storeHistory = false;
			historyRec.search = searchText;
			historyRec.searchText = searchText;
			historyRec.tiny_url = tiny_url;
			historyRec.clone_name = cloneName;
			historyRec.search_version = searchVersion;
			historyRec.request_body = req.body;
			historyRec.showTutorial = showTutorial;

			const operator = 'and';
			const clientObj = { esClientName: 'eda', esIndex: this.constants.EDA_ELASTIC_SEARCH_OPTS.index };
			// log query to ES
			if (storeHistory) {
				await this.storeEsRecord(clientObj.esClientName, offset, cloneName, historyRec.user_id, searchText);
			}

			let searchResults;
			searchResults = await this.documentSearch(
				req,
				{ ...req.body, expansionDict: {}, operator },
				clientObj,
				userId
			);

			// try storing results record
			if (storeHistory && !forCacheReload) {
				try {
					const { totalCount } = searchResults;
					historyRec.endTime = new Date().toISOString();
					historyRec.numResults = totalCount;
					await this.storeRecordOfSearchInPg(historyRec, userId);
				} catch (e) {
					this.logger.error(e.message, 'ZMVI2TO', userId);
				}
			}

			return searchResults;
		} catch (err) {
			if (storeHistory && !forCacheReload) {
				const { message } = err;
				this.logger.error(message, '3VOOUHO', userId);
				historyRec.endTime = new Date().toISOString();
				historyRec.hadError = true;
				await this.storeRecordOfSearchInPg(historyRec, showTutorial);
			}
			throw err;
		}
	}

	async storeEsRecord(esClient, offset, clone_name, userId, searchText) {
		try {
			// log search query to elasticsearch
			if (offset === 0) {
				let clone_log = clone_name || 'policy';
				const searchLog = {
					user_id: userId,
					search_query: searchText,
					run_time: new Date().getTime(),
					clone_name: clone_log,
				};
				let search_history_index = this.constants.GAME_CHANGER_OPTS.historyIndex;

				await this.dataLibrary.putDocument(esClient, search_history_index, searchLog);
			}
		} catch (e) {
			this.logger.error(e.message, 'UA0YDAL');
		}
	}

	async documentSearch(req, body, clientObj, userId) {
		try {
			let permissions = [];

			if (req.permissions) {
				permissions = typeof req.permissions === 'string' ? [req.permissions] : req.permissions;
			}
			permissions = permissions.map((permission) => permission.toLowerCase());

			const { getIdList, selectedDocuments, expansionDict = {}, forGraphCache = false } = body;
			const [parsedQuery, searchTerms] = this.searchUtility.getEsSearchTerms(body);
			body.searchTerms = searchTerms;
			body.parsedQuery = parsedQuery;

			const { esClientName, esIndex } = clientObj;

			if (
				!(
					permissions.includes('view eda') ||
					permissions.includes('eda admin') ||
					permissions.includes('view gamechanger')
				)
			) {
				throw new Error('Unauthorized');
			}

			const { extSearchFields = [], extRetrieveFields = [] } = this.constants.EDA_ELASTIC_SEARCH_OPTS;
			body.extSearchFields = extSearchFields.map((field) => field.toLowerCase());
			body.extStoredFields = extRetrieveFields.map((field) => field.toLowerCase());

			let esQuery = this.edaSearchUtility.getElasticsearchPagesQuery(body, userId);

			const results = await this.dataLibrary.queryElasticSearch(esClientName, esIndex, esQuery, userId);

			if (results?.body?.hits?.total?.value > 0) {
				if (getIdList) {
					return this.searchUtility.cleanUpIdEsResults(results, searchTerms, userId, expansionDict);
				}

				if (forGraphCache) {
					return this.searchUtility.cleanUpIdEsResultsForGraphCache(results, userId);
				}

				return this.edaSearchUtility.cleanUpEsResults(
					results,
					searchTerms,
					userId,
					selectedDocuments,
					expansionDict,
					esIndex,
					esQuery
				);
			} else if (results?.body?.hits?.total?.value === 0) {
				return { totalCount: 0, docs: [] };
			} else {
				this.logger.error('Error with Elasticsearch results', 'JY3IIJ3', userId);
				return { totalCount: 0, docs: [] };
			}
		} catch (e) {
			console.log(e);
			const { message } = e;
			this.logger.error(message, 'YNR8ZIT', userId);
			throw e;
		}
	}

	sortContractMod(a, b) {
		if (!a.modNumber) {
			return 1;
		}
		if (!b.modNumber) {
			return -1;
		}

		if (a.modNumber < b.modNumber) {
			return -1;
		} else {
			return 1;
		}
	}

	async queryContractMods(req, userId) {
		try {
			const clientObj = { esClientName: 'eda', esIndex: this.constants.EDA_ELASTIC_SEARCH_OPTS.index };
			const permissions = req.permissions ? req.permissions.map((permission) => permission.toLowerCase()) : [];
			const { esClientName, esIndex } = clientObj;
			const { awardID, isSearch } = req.body;
			const { id, idv } = this.edaSearchUtility.splitAwardID(awardID);

			let esQuery = '';
			if (permissions.includes('view eda') || permissions.includes('eda admin')) {
				esQuery = this.edaSearchUtility.getEDAContractQuery(userId, id, idv, false, isSearch);
			} else {
				throw new Error('Unauthorized');
			}

			// use the award ID to get the related mod numbers
			const results = await this.dataLibrary.queryElasticSearch(esClientName, esIndex, esQuery, userId);
			if (results?.body?.hits?.total?.value > 0) {
				const hits = results.body.hits.hits;

				if (isSearch) {
					return this.edaSearchUtility.cleanUpEsResults(results, [], userId, [], [], esIndex, esQuery);
				}
				const contractMods = [];
				// grab the contract modification number
				for (let hit of hits) {
					contractMods.push({
						modNumber: hit._source.extracted_data_eda_n.modification_number_eda_ext ?? null,
						signatureDate: hit._source.extracted_data_eda_n.signature_date_eda_ext_dt ?? null,
						effectiveDate: hit._source.extracted_data_eda_n.effective_date_eda_ext_dt ?? null,
					});
				}
				contractMods.sort(this.sortContractMod);

				return contractMods;
			} else {
				this.logger.error('Error with contract mods Elasticsearch results', '3ZCEAYJ', userId);
				return [];
			}
		} catch (err) {
			const { message } = err;
			this.logger.error(message, 'S00CLT7', userId);
			throw err;
		}
	}

	async queryBaseAwardContract(req, userId) {
		try {
			const clientObj = { esClientName: 'eda', esIndex: this.constants.EDA_ELASTIC_SEARCH_OPTS.index };
			const permissions = req.permissions ? req.permissions.map((permission) => permission.toLowerCase()) : [];
			const { esClientName, esIndex } = clientObj;
			const { awardID } = req.body;

			const { id, idv } = this.edaSearchUtility.splitAwardID(awardID);

			let esQuery = '';
			if (permissions.includes('view eda') || permissions.includes('eda admin')) {
				esQuery = this.edaSearchUtility.getEDAContractQuery(userId, id, idv, true, false);
			} else {
				throw new Error('Unauthorized');
			}

			// use the award ID to get the base award data only
			const results = await this.dataLibrary.queryElasticSearch(esClientName, esIndex, esQuery, userId);
			if (results?.body?.hits?.total?.value > 0) {
				const hits = results.body.hits.hits;
				if (hits && hits.length > 0) {
					const data = hits[0];
					const metadata =
						data._source && data._source.extracted_data_eda_n
							? this.edaSearchUtility.getExtractedFields(data._source, data)
							: {};
					return { ...data._source, ...data.fields, ...metadata };
				} else {
					return {};
				}
			} else {
				this.logger.error('Error with contract base award Elasticsearch results', '3ZCEAYJ', userId);
				return [];
			}
		} catch (err) {
			const { message } = err;
			this.logger.error(message, 'MKNUZQR', userId);
			throw err;
		}
	}

	async querySimilarDocs(req, userId) {
		try {
			const clientObj = { esClientName: 'eda', esIndex: this.constants.EDA_ELASTIC_SEARCH_OPTS.index };
			const permissions = req.permissions ? req.permissions.map((permission) => permission.toLowerCase()) : [];
			const { esClientName, esIndex } = clientObj;
			const { body } = req;
			const { issueOfficeDoDAAC, issueOfficeName } = body;

			let esQuery = '';
			if (permissions.includes('view eda') || permissions.includes('eda admin')) {
				esQuery = this.edaSearchUtility.getElasticsearchPagesQuery(
					{ ...body, limit: 5, edaSearchSettings: { issueOfficeDoDAAC, issueOfficeName } },
					userId
				);
			} else {
				throw new Error('Unauthorized');
			}

			// use the award ID to get the base award data only
			const results = await this.dataLibrary.queryElasticSearch(esClientName, esIndex, esQuery, userId);

			if (results?.body?.hits?.total?.value > 0) {
				const hits = results.body.hits.hits;
				if (hits && hits.length > 0) {
					return this.edaSearchUtility.cleanUpEsResults(results, [], userId, [], {}, esIndex, esQuery);
				} else {
					return {};
				}
			} else {
				this.logger.error('Error with similar docs Elasticsearch results', 'P1TFZKQ', userId);
				return [];
			}
		} catch (err) {
			console.log('Error with query similar docs');
			console.log(err);
			this.logger.error(err.message, 'T5VRV7K', userId);
			throw err;
		}
	}

	async getPresearchData(userId) {
		try {
			let esIndex = this.constants.EDA_ELASTIC_SEARCH_OPTS.filterPicklistIndex;
			let esClientName = 'eda';

			// don't get hierarchal naics/psc/dodaac data for now
			const filter_options_query = {
				size: 12,
				query: {
					bool: {
						should: [
							{
								match: {
									picklist_name_s: 'fpds_vendor_name',
								},
							},
							{
								match: {
									picklist_name_s: 'fpds_naics_code',
								},
							},
							{
								match: {
									picklist_name_s: 'fpds_global_parent_duns_name',
								},
							},
							{
								match: {
									picklist_name_s: 'fpds_contracting_office_code',
								},
							},
							{
								match: {
									picklist_name_s: 'fpds_contracting_agency_name',
								},
							},
							{
								match: {
									picklist_name_s: 'fpds_modification_number',
								},
							},
							{
								match: {
									picklist_name_s: 'fpds_funding_agency_name',
								},
							},
							{
								match: {
									picklist_name_s: 'fpds_date_signed_dt',
								},
							},
							{
								match: {
									picklist_name_s: 'fpds_contracting_office_name',
								},
							},
							{
								match: {
									picklist_name_s: 'fpds_psc',
								},
							},
							{
								match: {
									picklist_name_s: 'fpds_funding_office_code',
								},
							},
							{
								match: {
									picklist_name_s: 'fpds_duns',
								},
							},
						],
					},
				},
			};

			const psc_hierarchical_filters_query = {
				query: {
					bool: {
						must: [
							{
								match: {
									picklist_name_s: 'psc',
								},
							},
						],
						must_not: [
							{
								exists: {
									field: 'parentCode_s',
								},
							},
						],
					},
				},
				sort: [
					{
						code_s: {
							order: 'asc',
						},
					},
				],
				size: 100,
			};

			const naics_hierarchical_filters_query = {
				query: {
					bool: {
						must: [
							{
								match: {
									picklist_name_s: 'naics',
								},
							},
						],
						must_not: [
							{
								exists: {
									field: 'parentCode_s',
								},
							},
						],
					},
				},
				sort: [
					{
						code_s: {
							order: 'asc',
						},
					},
				],
				size: 100,
			};

			const filter_options_promise = this.dataLibrary.queryElasticSearch(
				esClientName,
				esIndex,
				filter_options_query,
				userId
			);

			const psc_hierarchical_filters_promise = this.dataLibrary.queryElasticSearch(
				esClientName,
				esIndex,
				psc_hierarchical_filters_query,
				userId
			);

			const naics_hierarchical_filters_promise = this.dataLibrary.queryElasticSearch(
				esClientName,
				esIndex,
				naics_hierarchical_filters_query,
				userId
			);

			const [filter_options_results, psc_hierarchical_results, naics_hierarchical_results] = await Promise.all([
				filter_options_promise,
				psc_hierarchical_filters_promise,
				naics_hierarchical_filters_promise,
			]);

			let cleanedResults = {
				filters: {},
				hierarchical_filters: { psc: [], naics: [] },
			};

			filter_options_results.body.hits.hits.forEach((hit) => {
				const { picklist_name_s, picklist_s } = hit._source;
				cleanedResults.filters[picklist_name_s] = picklist_s;
			});

			psc_hierarchical_results.body.hits.hits.forEach((hit) => {
				cleanedResults.hierarchical_filters.psc.push({
					code: hit._source.code_s,
					name: hit._source.productName_s,
					hasChildren: hit._source.hasChildren_b === 'true',
					parent: hit._source.parentCode_s,
				});
			});

			naics_hierarchical_results.body.hits.hits.forEach((hit) => {
				cleanedResults.hierarchical_filters.naics.push({
					code: hit._source.code_s,
					name: hit._source.title_s,
					hasChildren: hit._source.hasChildren_b === 'true',
					parent: hit._source.parentCode_s,
				});
			});

			return cleanedResults;
		} catch (e) {
			this.logger.error(e.message, 'BI5E7KT');
			return {};
		}
	}

	async getHierarchicalFilterData(req, userId) {
		try {
			const { body } = req;
			const { picklistName = '', parentCode = '' } = body;
			let esIndex = this.constants.EDA_ELASTIC_SEARCH_OPTS.filterPicklistIndex;
			let esClientName = 'eda';

			const filter_options_query = {
				size: 100,
				sort: [
					{
						code_s: {
							order: 'asc',
						},
					},
				],
				query: {
					bool: {
						must: [
							{
								match: {
									picklist_name_s: picklistName === 'naicsCode' ? 'naics' : picklistName,
								},
							},
							{
								match: {
									parentCode_s: parentCode,
								},
							},
						],
					},
				},
			};

			const filter_options_results = await this.dataLibrary.queryElasticSearch(
				esClientName,
				esIndex,
				filter_options_query,
				userId
			);

			let cleanedResults = [];

			filter_options_results.body.hits.hits.forEach((hit) => {
				if (picklistName === 'naicsCode') {
					cleanedResults.push({
						code: hit._source.code_s,
						name: hit._source.title_s,
						hasChildren: hit._source.hasChildren_b === 'true',
						parent: hit._source.parentCode_s,
					});
				} else if (picklistName === 'psc') {
					cleanedResults.push({
						code: hit._source.code_s,
						name: hit._source.productName_s,
						hasChildren: hit._source.hasChildren_b === 'true',
						parent: hit._source.parentCode_s,
					});
				}
			});

			return cleanedResults;
		} catch (e) {
			this.logger.error(e.message, 'B5YNTJC');
			return {};
		}
	}

	async callFunctionHelper(req, userId) {
		const { functionName } = req.body;

		try {
			const permissions = req.permissions ? req.permissions.map((permission) => permission.toLowerCase()) : [];
			if (permissions.includes('view eda') || permissions.includes('eda admin')) {
				switch (functionName) {
					case 'queryContractMods':
						return await this.queryContractMods(req, userId);
					case 'queryBaseAwardContract':
						return await this.queryBaseAwardContract(req, userId);
					case 'querySimilarDocs':
						return await this.querySimilarDocs(req, userId);
					case 'getPresearchData':
						return await this.getPresearchData(req, userId);
					case 'getHierarchicalFilterData':
						return await this.getHierarchicalFilterData(req, userId);
					default:
						this.logger.error(
							`There is no function called ${functionName} defined in the edaSearchHandler`,
							'W8A5BE0',
							userId
						);
						return {};
				}
			}
		} catch (err) {
			console.log(err);
			const { message } = err;
			this.logger.error(message, 'V2L9KW5', userId);
		}
	}
}

module.exports = EdaSearchHandler;
