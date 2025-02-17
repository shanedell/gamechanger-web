import React from 'react';
import Pluralize from 'pluralize';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import styled from 'styled-components';
import GCAccordion from '../../common/GCAccordion';
import GCButton from '../../common/GCButton';
import PolicyMultiSelectFilter from './PolicyMultiSelectFilter';
import _ from 'lodash';
import { FormControl, FormGroup, FormControlLabel, Checkbox } from '@material-ui/core';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import { ThemeProvider } from '@material-ui/core/styles';
import { setState } from '../../../utils/sharedFunctions';
import { gcOrange } from '../../common/gc-colors';
import themeDatePicker from '../../common/theme-datepicker';
import { trackEvent } from '../../telemetry/Matomo';
import { getTrackingNameForFactory } from '../../../utils/gamechangerUtils';

const DatePickerWrapper = styled.div`
	margin-right: 10px;
	display: flex;
	flex-direction: column;

	> label {
		text-align: left;
		margin-bottom: 2px;
		color: #3f4a56;
		font-size: 15px;
		font-family: Noto Sans;
	}

	> .react-datepicker-wrapper {
		> .react-datepicker__input-container {
			> input {
				width: 140px;
				border: 0;
				outline: 0;
				border-bottom: 1px solid black;
				font-size: 15px;
			}
		}
	}
`;

const handleOrganizationFilterChangeAdv = (event, state, dispatch) => {
	const newSearchSettings = structuredClone(state.searchSettings);
	if (state.searchSettings.allOrgsSelected) {
		newSearchSettings.allOrgsSelected = false;
		newSearchSettings.specificOrgsSelected = true;
	}
	let orgName = event.target.name;
	newSearchSettings.orgFilter = {
		...newSearchSettings.orgFilter,
		[orgName]: event.target.checked,
	};
	if (Object.values(newSearchSettings.orgFilter).filter((value) => value).length === 0) {
		newSearchSettings.allOrgsSelected = true;
		newSearchSettings.specificOrgsSelected = false;
	}
	setState(dispatch, {
		searchSettings: newSearchSettings,
		metricsCounted: false,
	});
	trackEvent(
		getTrackingNameForFactory(state.cloneData.clone_name),
		'OrgFilterToggle',
		event.target.name,
		event.target.checked ? 1 : 0
	);
};

const getSeeMoreText = (expanded) => {
	return expanded ? 'See Less' : 'See More';
};

const renderSources = (state, dispatch, classes, searchbar = false) => {
	const { originalOrgFilters, orgFilter } = state.searchSettings;

	return (
		<FormControl style={{ padding: '10px', paddingTop: '10px', paddingBottom: '10px' }}>
			{searchbar ? (
				<>
					<FormGroup row style={{ marginLeft: '10px', width: '100%' }}>
						{Object.keys(orgFilter).map((org, index) => {
							if (index < 10 || state.seeMoreSources) {
								return (
									<FormControlLabel
										key={`${org}`}
										value={`${originalOrgFilters[org]}`}
										classes={{
											root: classes.rootLabel,
											label: classes.checkboxPill,
										}}
										control={
											<Checkbox
												classes={{
													root: classes.rootButton,
													checked: classes.checkedButton,
												}}
												name={`${org}`}
												checked={state.searchSettings.orgFilter[org]}
												onClick={(event) =>
													handleOrganizationFilterChangeAdv(event, state, dispatch)
												}
											/>
										}
										label={`${org}`}
										labelPlacement="end"
									/>
								);
							} else {
								return null;
							}
						})}
					</FormGroup>
					{
						// eslint-disable-next-line
						<a
							style={{ cursor: 'pointer', fontSize: '16px' }}
							onClick={() => {
								setState(dispatch, { seeMoreSources: !state.seeMoreSources });
							}}
						>
							{getSeeMoreText(state.seeMoreSources)}
						</a> // jsx-a11y/anchor-is-valid
					}
				</>
			) : (
				<PolicyMultiSelectFilter
					state={state}
					dispatch={dispatch}
					classes={classes}
					searchSettingsName={'searchSettings'}
					filter={'orgFilter'}
					originalFilters={originalOrgFilters}
					allSelected={'allOrgsSelected'}
					specificSelected={'specificOrgsSelected'}
					update={'orgUpdate'}
					trackingName={'OrgFilterToggle'}
					showNumResultsPerOption={originalOrgFilters.reduce(
						(nonzeroCountExists, filter) => nonzeroCountExists || !!filter[1],
						false
					)}
				/>
			)}
		</FormControl>
	);
};

const handleSelectArchivedCongress = (event, state, dispatch) => {
	trackEvent(
		getTrackingNameForFactory(state.cloneData.clone_name),
		'TypeFilterToggle',
		'ArchivedCongress',
		event.target.checked ? 1 : 0
	);
	const newSearchSettings = structuredClone(state.searchSettings);
	newSearchSettings.archivedCongressSelected = event.target.checked;
	newSearchSettings.isFilterUpdate = true;
	setState(dispatch, {
		searchSettings: newSearchSettings,
		metricsCounted: false,
		runSearch: true,
		runGraphSearch: true,
	});
};

const handleTypeFilterChangeSearchbar = (event, type, state, dispatch) => {
	const newSearchSettings = structuredClone(state.searchSettings);
	if (state.searchSettings.allTypesSelected) {
		newSearchSettings.allTypesSelected = false;
		newSearchSettings.specificTypesSelected = true;
	}
	newSearchSettings.typeFilter = {
		...newSearchSettings.typeFilter,
		[type]: event.target.checked,
	};
	if (Object.values(newSearchSettings.typeFilter).filter((value) => value).length === 0) {
		newSearchSettings.allTypesSelected = true;
		newSearchSettings.specificTypesSelected = false;
	}
	setState(dispatch, {
		searchSettings: newSearchSettings,
		metricsCounted: false,
	});

	trackEvent(
		getTrackingNameForFactory(state.cloneData.clone_name),
		'TypeFilterToggle',
		event.target.name,
		event.target.checked ? 1 : 0
	);
};

const renderTypes = (state, dispatch, classes, searchbar = false) => {
	const { originalTypeFilters, typeFilter } = state.searchSettings;

	return (
		<FormControl style={{ padding: '10px', paddingTop: '10px', paddingBottom: '10px' }}>
			{searchbar ? (
				<>
					<FormGroup row style={{ marginLeft: '10px', width: '100%' }}>
						{Object.keys(typeFilter).map((type, index) => {
							let typeString = Pluralize(type);

							if (index < 10 || state.seeMoreTypes) {
								return (
									<FormControlLabel
										key={`${typeString}`}
										value={`${typeString}`}
										classes={{
											root: classes.rootLabel,
											label: classes.checkboxPill,
										}}
										control={
											<Checkbox
												classes={{
													root: classes.rootButton,
													checked: classes.checkedButton,
												}}
												name={`${typeString}`}
												checked={state.searchSettings.typeFilter[type]}
												onClick={(event) =>
													handleTypeFilterChangeSearchbar(event, type, state, dispatch)
												}
											/>
										}
										label={`${typeString}`}
										labelPlacement="end"
									/>
								);
							} else {
								return null;
							}
						})}
					</FormGroup>
					{
						// eslint-disable-next-line
						<a
							style={{ cursor: 'pointer', fontSize: '16px' }}
							onClick={() => {
								setState(dispatch, { seeMoreTypes: !state.seeMoreTypes });
							}}
						>
							{getSeeMoreText(state.seeMoreTypes)}
						</a>
					}
				</>
			) : (
				<>
					<PolicyMultiSelectFilter
						state={state}
						dispatch={dispatch}
						classes={classes}
						searchSettingsName={'searchSettings'}
						filter={'typeFilter'}
						originalFilters={originalTypeFilters}
						allSelected={'allTypesSelected'}
						specificSelected={'specificTypesSelected'}
						update={'typeUpdate'}
						trackingName={'TypeFilterToggle'}
						showNumResultsPerOption={originalTypeFilters.reduce(
							(nonzeroCountExists, filter) => nonzeroCountExists || !!filter[1],
							false
						)}
					/>
				</>
			)}
		</FormControl>
	);
};

const handleDateRangeChange = (date, isStartDate, filterType, state, dispatch) => {
	trackEvent(
		getTrackingNameForFactory(state.cloneData.clone_name),
		`Publication${isStartDate ? 'Start' : 'End'}DateFilterChange`,
		date ? date.toString() : date
	);

	const newSearchSettings = _.cloneDeep(state.searchSettings);
	newSearchSettings.publicationDateAllTime = false;
	const { publicationDateFilter, accessDateFilter } = newSearchSettings;

	if (Object.prototype.toString.call(date) === '[object Date]') {
		date.setHours(0);
		date.setMinutes(0);
		date.setSeconds(0);
	}

	let temp;
	switch (filterType) {
		case 'publication':
			temp = publicationDateFilter;
			break;
		case 'timestamp':
			temp = accessDateFilter;
			break;
		default:
			break;
	}

	if (isStartDate) {
		temp[0] = date;
	} else {
		temp[1] = date;
	}
	let runSearch = false;
	let runGraphSearch = false;
	if (!isNaN(temp[0]?.getTime()) && !isNaN(temp[1]?.getTime())) {
		runSearch = true;
		runGraphSearch = true;
		newSearchSettings.isFilterUpdate = true;
	}

	if (filterType === 'publication') {
		newSearchSettings.publicationDateFilter = temp;
	} else {
		newSearchSettings.accessDateFilter = temp;
	}
	setState(dispatch, {
		searchSettings: newSearchSettings,
		metricsCounted: false,
		runSearch,
		runGraphSearch,
	});
};

const renderDates = (state, dispatch) => {
	return (
		<div style={{ padding: '10px' }}>
			<ThemeProvider theme={themeDatePicker}>
				<div style={{ display: 'flex', flexWrap: 'wrap' }}>
					<DatePickerWrapper>
						<label>Start Date</label>
						<DatePicker
							selected={state.searchSettings.publicationDateFilter[0]}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									handleDateRangeChange(
										state.searchSettings.publicationDateFilter[0],
										true,
										'publication',
										state,
										dispatch
									);
								}
							}}
							onChange={(date) => {
								const newSearchSettings = _.cloneDeep(state.searchSettings);
								newSearchSettings.publicationDateFilter[0] = date;
								setState(dispatch, {
									searchSettings: newSearchSettings,
								});
							}}
							onSelect={(date) => {
								handleDateRangeChange(date, true, 'publication', state, dispatch);
							}}
						/>
					</DatePickerWrapper>
					<DatePickerWrapper>
						<label>End Date</label>
						<DatePicker
							selected={state.searchSettings.publicationDateFilter[1]}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									handleDateRangeChange(
										state.searchSettings.publicationDateFilter[1],
										false,
										'publication',
										state,
										dispatch
									);
								}
							}}
							onChange={(date) => {
								const newSearchSettings = _.cloneDeep(state.searchSettings);
								newSearchSettings.publicationDateFilter[1] = date;
								setState(dispatch, {
									searchSettings: newSearchSettings,
								});
							}}
							onSelect={(date) => {
								handleDateRangeChange(date, false, 'publication', state, dispatch);
							}}
						/>
					</DatePickerWrapper>
				</div>
			</ThemeProvider>
		</div>
	);
};

const handleRevokedChange = (event, state, dispatch) => {
	const newSearchSettings = _.cloneDeep(state.searchSettings);
	newSearchSettings.includeRevoked = event.target.checked;
	newSearchSettings.isFilterUpdate = true;
	setState(dispatch, {
		searchSettings: newSearchSettings,
		metricsCounted: false,
		runSearch: true,
		runGraphSearch: true,
	});
	trackEvent(
		getTrackingNameForFactory(state.cloneData.clone_name),
		'StatusFilterToggle',
		'IncludeCanceledDocuments',
		event.target.checked ? 1 : 0
	);
};

const renderStatus = (state, dispatch, classes) => {
	return (
		<div>
			<FormControl style={{ padding: '10px', paddingTop: '10px', paddingBottom: '10px' }}>
				<FormGroup row style={{ marginBottom: '10px' }}>
					<FormControlLabel
						name="Include Archived Congressional Documents"
						value="Include Archived Congressional Documents"
						classes={{ label: classes.checkboxText }}
						control={
							<Checkbox
								classes={{ root: classes.filterBox }}
								onClick={(event) => handleSelectArchivedCongress(event, state, dispatch)}
								icon={<CheckBoxOutlineBlankIcon style={{ visibility: 'hidden' }} />}
								checked={state.searchSettings.archivedCongressSelected || false}
								checkedIcon={<i style={{ color: '#E9691D' }} className="fa fa-check" />}
								name="Include Archived Congressional Documents"
							/>
						}
						label="Include Archived Congressional Documents"
						labelPlacement="end"
					/>
				</FormGroup>
				<FormGroup row style={{ marginBottom: '0px' }}>
					<FormControlLabel
						name="Revoked Docs"
						value="Revoked Docs"
						classes={{ label: classes.checkboxText }}
						control={
							<Checkbox
								classes={{ root: classes.filterBox }}
								onClick={(event) => handleRevokedChange(event, state, dispatch)}
								icon={<CheckBoxOutlineBlankIcon style={{ visibility: 'hidden' }} />}
								checked={state.searchSettings.includeRevoked}
								checkedIcon={<i style={{ color: '#E9691D' }} className="fa fa-check" />}
								name="Revoked Docs"
							/>
						}
						label="Include Canceled Documents"
						labelPlacement="end"
					/>
				</FormGroup>
			</FormControl>
		</div>
	);
};

const resetAdvancedSettings = (dispatch, state) => {
	trackEvent(getTrackingNameForFactory(state.cloneData.clone_name), 'AdvancedSearchSettings', 'onClickClearFilters');
	dispatch({ type: 'RESET_PRESEARCH_SETTINGS' });
};

const clearFilters = (dispatch, state) => {
	dispatch({ type: 'RESET_SEARCH_SETTINGS' });
	setState(dispatch, { runSearch: true, runGraphSearch: true });
	trackEvent(getTrackingNameForFactory(state.cloneData.clone_name), 'ClearFilters', 'onClick');
};

const getSearchMatrixItems = (props) => {
	const { state, dispatch, classes } = props;

	const sourceCount = Object.values(state.searchSettings.orgFilter).filter(Boolean).length;
	const typeCount = Object.values(state.searchSettings.typeFilter).filter(Boolean).length;

	return (
		<>
			<div data-cy={'source-accordion'} style={{ width: '100%', marginBottom: 10 }}>
				<GCAccordion
					header={
						<>
							SOURCE <span style={styles.filterCount}>{sourceCount ? `(${sourceCount})` : ''}</span>
						</>
					}
					headerBackground={'rgb(238,241,242)'}
					headerTextColor={'black'}
					headerTextWeight={'normal'}
				>
					{renderSources(state, dispatch, classes)}
				</GCAccordion>
			</div>

			<div data-cy={'type-accordion'} style={{ width: '100%', marginBottom: 10 }}>
				<GCAccordion
					header={
						<>
							TYPE <span style={styles.filterCount}>{typeCount ? `(${typeCount})` : ''}</span>
						</>
					}
					headerBackground={'rgb(238,241,242)'}
					headerTextColor={'black'}
					headerTextWeight={'normal'}
				>
					{renderTypes(state, dispatch, classes)}
				</GCAccordion>
			</div>

			<div style={{ width: '100%', marginBottom: 10 }}>
				<GCAccordion
					header={'PUBLICATION DATE'}
					headerBackground={'rgb(238,241,242)'}
					headerTextColor={'black'}
					headerTextWeight={'normal'}
				>
					{renderDates(state, dispatch)}
				</GCAccordion>
			</div>

			<div style={{ width: '100%', marginBottom: 10 }}>
				<GCAccordion
					header={'STATUS'}
					headerBackground={'rgb(238,241,242)'}
					headerTextColor={'black'}
					headerTextWeight={'normal'}
				>
					{renderStatus(state, dispatch, classes)}
				</GCAccordion>
			</div>

			<button
				type="button"
				style={{
					border: 'none',
					backgroundColor: '#B0BAC5',
					padding: '0 15px',
					display: 'flex',
					height: 50,
					alignItems: 'center',
					borderRadius: 5,
				}}
				onClick={() => {
					clearFilters(dispatch, state);
				}}
			>
				<span
					style={{
						fontFamily: 'Montserrat',
						fontWeight: 600,
						width: '100%',
						marginTop: '5px',
						marginBottom: '10px',
						marginLeft: '-1px',
					}}
				>
					Clear Filters
				</span>
			</button>
		</>
	);
};

export const getAdvancedOptions = (props) => {
	const { state, dispatch, classes, handleSubmit } = props;

	return (
		<>
			<div style={styles.filterDiv}>
				<strong style={styles.boldText}>SOURCE</strong>
				<hr style={{ marginTop: '5px', marginBottom: '10px' }} />
				<div>{renderSources(state, dispatch, classes, true)}</div>
			</div>

			<div style={styles.filterDiv}>
				<strong style={styles.boldText}>TYPE</strong>
				<hr style={{ marginTop: '5px', marginBottom: '10px' }} />
				{renderTypes(state, dispatch, classes, true)}
			</div>

			<div style={styles.filterDiv}>
				<strong style={styles.boldText}>PUBLICATION DATE</strong>
				<hr style={{ marginTop: '5px', marginBottom: '10px' }} />
				{renderDates(state, dispatch)}
			</div>

			<div style={styles.filterDiv}>
				<strong style={styles.boldText}>STATUS</strong>
				<hr style={{ marginTop: '5px', marginBottom: '10px' }} />
				{renderStatus(state, dispatch, classes)}
			</div>
			<div style={{ display: 'flex', margin: '10px' }}>
				<div style={{ width: '120px', height: '40px', marginRight: '20px' }}>
					<GCButton
						style={{
							border: 'none',
							width: '100%',
							height: '100%',
							padding: '0px',
						}}
						isSecondaryBtn={true}
						onClick={() => resetAdvancedSettings(dispatch, state)}
					>
						Clear Filters
					</GCButton>
				</div>
				<div style={{ width: '120px', height: '40px' }}>
					<GCButton style={{ width: '100%', height: '100%' }} onClick={handleSubmit}>
						Search
					</GCButton>
				</div>
			</div>
		</>
	);
};

const PolicySearchMatrixHandler = (props) => {
	return <>{getSearchMatrixItems(props)}</>;
};

const styles = {
	filterCount: {
		color: gcOrange,
	},
	innerContainer: {
		display: 'flex',
		height: '100%',
		flexDirection: 'column',
	},
	cardBody: {
		padding: '10px 0px',
		fontSize: '1.1em',
		fontFamily: 'Noto Sans',
	},
	subHead: {
		fontSize: '1.0em',
		display: 'flex',
		position: 'relative',
	},
	headerColumn: {
		fontSize: '1.0em',
		width: '100%',
		padding: '8px 8px',
		backgroundColor: 'rgb(50,53,64)',
		display: 'flex',
		alignItems: 'center',
	},
	filterDiv: {
		display: 'block',
		margin: '10px',
	},
	boldText: {
		fontSize: '0.8em',
	},
};

export default PolicySearchMatrixHandler;
