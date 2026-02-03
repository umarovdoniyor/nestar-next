import { NextPage } from 'next';
import useDeviceDetect from '../libs/hooks/useDeviceDetect';
import withLayoutMain from '../libs/components/layout/LayoutHome';
import CommunityBoards from '../libs/components/homepage/CommunityBoards';
import PopularProperties from '../libs/components/homepage/PopularProperties';
import TopAgents from '../libs/components/homepage/TopAgents';
import Events from '../libs/components/homepage/Events';
import TrendProperties from '../libs/components/homepage/TrendProperties';
import TopProperties from '../libs/components/homepage/TopProperties';
import { Stack } from '@mui/material';
import Advertisement from '../libs/components/homepage/Advertisement';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common'])),
	},
});

const Home: NextPage = () => {
	const device = useDeviceDetect();

	if (device === 'mobile') {
		return (
			<Stack className={'home-page'}>
				<TrendProperties />
				<PopularProperties />
				<Advertisement />
				<TopProperties />
				<TopAgents />
			</Stack>
		);
	} else {
		return (
			<Stack className={'home-page'}>
				<TrendProperties />
				<PopularProperties />
				<Advertisement />
				<TopProperties />
				<TopAgents />
				<Events />
				<CommunityBoards />
			</Stack>
		);
	}
};

export default withLayoutMain(Home);

/**
 * 1. Browser: GET http://localhost:3000/
       ↓
2. Next.js: Load pages/index.tsx
       ↓
3. withLayoutMain wrapper executes:
   - Check JWT token
   - Update user info if logged in
   - Detect device (mobile/PC)
       ↓
4. Render layout:
   - Top component (header)
   - FiberContainer (3D bg)
   - HeaderFilter (search)
       ↓
5. Render Home component inside layout:
   - TrendProperties fetches data
   - PopularProperties fetches data
   - TopAgents fetches data
   - etc.
       ↓
6. Bottom components:
   - Chat (if logged in)
   - Footer
       ↓
7. Page fully rendered
 */
