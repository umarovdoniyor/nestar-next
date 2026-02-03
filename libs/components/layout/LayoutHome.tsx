import React, { useEffect } from 'react';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import Head from 'next/head';
import Top from '../Top';
import Footer from '../Footer';
import { Stack } from '@mui/material';
import FiberContainer from '../common/FiberContainer';
import HeaderFilter from '../homepage/HeaderFilter';
import { userVar } from '../../../apollo/store';
import { useReactiveVar } from '@apollo/client';
import { getJwtToken, updateUserInfo } from '../../auth';
import Chat from '../Chat';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

const withLayoutMain = (Component: any) => {
	return (props: any) => {
		const device = useDeviceDetect(); // Detect mobile/PC
		const user = useReactiveVar(userVar); // Global user state from Apollo

		/** LIFECYCLES **/
		useEffect(() => {
			const jwt = getJwtToken(); // Check if user is logged in
			if (jwt) updateUserInfo(jwt); // Update user info if logged in
		}, []);

		/** HANDLERS **/

		// ---- RENDER LOGIC ----
		// Different layouts for mobile vs desktop
		if (device == 'mobile') {
			return (
				<>
					<Head>
						<title>Nestar</title>
						<meta name={'title'} content={`Nestar`} />
					</Head>

					<Stack id="mobile-wrap">
						<Stack id={'top'}>
							<Top />
						</Stack>

						<Stack id={'main'}>
							<Component {...props} />
						</Stack>

						<Stack id={'footer'}>
							<Footer />
						</Stack>
					</Stack>
				</>
			);
		} else {
			return (
				<>
					<Head>
						<title>Nestar</title>
						<meta name={'title'} content={`Nestar`} />
					</Head>
					<Stack id="pc-wrap">
						<Stack id={'top'}>
							<Top />
						</Stack>

						<Stack className={'header-main'}>
							<FiberContainer />
							<Stack className={'container'}>
								<HeaderFilter />
							</Stack>
						</Stack>

						<Stack id={'main'}>
							<Component {...props} />
						</Stack>

						{user?._id && <Chat />}

						<Stack id={'footer'}>
							<Footer />
						</Stack>
					</Stack>
				</>
			);
		}
	};
};

export default withLayoutMain;

/**
 * HOC for main layout
 * - Different layout for mobile and desktop
 * - Includes Top, Footer, HeaderFilter components
 * - Uses Apollo reactive var for user state
 * - Updates user info on mount if JWT token exists
 * 
 * Browser requests "/"
    ↓
Next.js loads pages/index.tsx
    ↓
withLayoutMain(Home) is executed
    ↓
Layout wrapper renders with Home component inside
 */

/**
 * <>
  <Head>
    <title>Nestar</title>                    {/* Browser tab title */
// </Head>

//<Stack id="pc-wrap">                        {/* Main container */}

//<Stack id={'top'}>
//  <Top />                                 {/* Header: Logo, Nav, Auth */}
//</Stack>

// <Stack className={'header-main'}>
//   <FiberContainer />                      {/* 3D animated background */}
// <Stack className={'container'}>
// <HeaderFilter />                      {/* Search bar with filters */}
// </Stack>
// </Stack>

// <Stack id={'main'}>
// <Component {...props} />                {/* YOUR HOME COMPONENT GOES HERE */}
// </Stack>

// {user?._id && <Chat />}                   {/* Chat widget (only if logged in) */}

// <Stack id={'footer'}>
// <Footer />                              {/* Footer links */}
// </Stack>

// </Stack>
// </>
//  */

/**
 * ┌─────────────────────────────────────────────────┐
│  TOP COMPONENT                                  │
│  [Logo]  [Home] [Property] [Agent]  [Login]    │
├─────────────────────────────────────────────────┤
│                                                 │
│  FIBER CONTAINER (3D animated background)       │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  HEADER FILTER                            │ │
│  │  [Location ▼] [Type ▼] [Rooms ▼] [Search]│ │
│  └───────────────────────────────────────────┘ │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  MAIN CONTENT (Your Home component)             │
│  ┌───────────────────────────────────────────┐ │
│  │  <TrendProperties />                      │ │
│  │  <PopularProperties />                    │ │
│  │  <Advertisement />                        │ │
│  │  <TopProperties />                        │ │
│  │  <TopAgents />                            │ │
│  │  <Events />                               │ │
│  │  <CommunityBoards />                      │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
├─────────────────────────────────────────────────┤
│  [💬 Chat Widget]  (if logged in)              │
├─────────────────────────────────────────────────┤
│  FOOTER                                         │
│  [About] [Contact] [Terms] [Social Links]      │
└─────────────────────────────────────────────────┘
 */
