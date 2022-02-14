import React from 'react';
import NotificationsManagement from '../../notifications/NotificationsManagement';
import UserList from '../../admin/UserList';
import {Tooltip} from '@material-ui/core';
import {HoverNavItem} from '../../navigation/NavItems';
import {toolTheme} from '../../admin/util/GCAdminStyles';
import AdminIcon from '../../../images/icon/AdminIcon.png';
import {AddAlert, SupervisedUserCircle} from '@material-ui/icons';
import { ConstrainedIcon } from '@dod-advana/advana-side-nav/dist/SlideOutMenu';
import Permissions from '@dod-advana/advana-platform-ui/dist/utilities/permissions';
import defaultAdminMainViewHandler from '../default/defaultAdminMainViewHandler';

const PAGES = {
	general: 'General',
	userList: 'Users',
	notifications: 'Notifications',
};

const renderGeneralAdminButtons = () => {
	return (<></>);
}

const PolicyAdminMainViewHandler = {
	getPages: () => {
		return PAGES;
	},

	renderSwitch: (page, cloneName) => {
		switch (page) {
			case PAGES.general:
				return renderGeneralAdminButtons();
			case PAGES.notifications:
				return <NotificationsManagement cloneName={cloneName} />;
			case PAGES.userList:
				return <UserList />;
			default:
				return renderGeneralAdminButtons();
		}
	},
	
	closedAdminMenu: (setPageToView, pages, cloneName) => {
		return (
			<div
				style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
			>
				{Permissions.permissionValidator(`${cloneName} Admin`, true) && (
					<Tooltip title="Admin Page" placement="right" arrow>
						<HoverNavItem
							centered
							onClick={() => {
								setPageToView(PAGES.general);
								return false;
							}}
							toolTheme={toolTheme}
						>
							<ConstrainedIcon src={AdminIcon} />
						</HoverNavItem>
					</Tooltip>
				)}

				{Permissions.permissionValidator(`${cloneName} Admin`, true) && (
					<Tooltip title="Service Notifications" placement="right" arrow>
						<HoverNavItem
							centered
							onClick={() => setPageToView(PAGES.notifications)}
							toolTheme={toolTheme}
						>
							<AddAlert style={{ fontSize: 30 }} />
						</HoverNavItem>
					</Tooltip>
				)}
	
				{Permissions.permissionValidator(`${cloneName} Admin`, true) && (
					<Tooltip title="Manage Users" placement="right" arrow>
						<HoverNavItem
							centered
							onClick={() => setPageToView(PAGES.userList)}
							toolTheme={toolTheme}
						>
							<SupervisedUserCircle style={{ fontSize: 30 }} />
						</HoverNavItem>
					</Tooltip>
				)}

			</div>
		);
	},
	
	openedAdminMenu: (setPageToView, pages, cloneName) => {
		return (
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				{Permissions.permissionValidator(`${cloneName} Admin`, true) && (
					<Tooltip title="Admin Page" placement="right" arrow>
						<HoverNavItem
							onClick={() => {
								setPageToView(PAGES.general);
								return false;
							}}
							toolTheme={toolTheme}
						>
							<ConstrainedIcon src={AdminIcon} />
							<span style={{ marginLeft: '10px' }}>Admin Page</span>
						</HoverNavItem>
					</Tooltip>
				)}

				{Permissions.permissionValidator(`${cloneName} Admin`, true) && (
					<Tooltip title="Show Notifications" placement="right" arrow>
						<HoverNavItem
							onClick={() => setPageToView(PAGES.notifications)}
							toolTheme={toolTheme}
						>
							<AddAlert style={{ fontSize: 30 }} />
							<span style={{ marginLeft: '5px' }}>Show Notifications</span>
						</HoverNavItem>
					</Tooltip>
				)}

				{Permissions.permissionValidator(`${cloneName} Admin`, true) && (
					<Tooltip title="Manage Users" placement="right" arrow>
						<HoverNavItem
							onClick={() => setPageToView(PAGES.userList)}
							toolTheme={toolTheme}
						>
							<SupervisedUserCircle style={{ fontSize: 30 }} />
							<span style={{ marginLeft: '5px' }}>Manage Users</span>
						</HoverNavItem>
					</Tooltip>
				)}
			</div>
		);
	},
	
	getToolTheme: (cloneData) => {
		return defaultAdminMainViewHandler.getToolTheme(cloneData);
	}
};

export default PolicyAdminMainViewHandler;
