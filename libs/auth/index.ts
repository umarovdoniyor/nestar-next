/** This file handles all authentication logic - login, signup, logout, and token management. */
import decodeJWT from 'jwt-decode';
import { initializeApollo } from '../../apollo/client';
import { userVar } from '../../apollo/store';
import { CustomJwtPayload } from '../types/customJwtPayload';
import { sweetMixinErrorAlert } from '../sweetAlert';
import { LOGIN, SIGN_UP } from '../../apollo/user/mutation';

/** =============== getJwtToken ===============*/
/** Purpose: Retrieve JWT token from browser's localStorage */
export function getJwtToken(): any {
	if (typeof window !== 'undefined') {
		//Check if code is running in browser (not server-side)
		return localStorage.getItem('accessToken') ?? '';
	}
}

/** =============== setJwtToken ===============*/
/** Purpose: Store JWT token in browser's localStorage */
export function setJwtToken(token: string) {
	localStorage.setItem('accessToken', token);
}

/** =============== logIn ===============*/
/** Purpose: Authenticate user and store JWT token */
export const logIn = async (nick: string, password: string): Promise<void> => {
	try {
		// 1. Request JWT token from server
		const { jwtToken } = await requestJwtToken({ nick, password });

		// 2. If token received, store it and update user info
		if (jwtToken) {
			updateStorage({ jwtToken });
			updateUserInfo(jwtToken);
		}
	} catch (err) {
		// 3. Handle errors during login process
		console.warn('login err', err);
		logOut(); // Clear any existing user data on error
		throw new Error('Login Err');
	}
};

/** =============== requestJwtToken ===============*/
/** Purpose: Request JWT token from server during login */
const requestJwtToken = async ({
	nick,
	password,
}: {
	nick: string;
	password: string;
}): Promise<{ jwtToken: string }> => {
	// 1. Get Apollo Client instance
	const apolloClient = await initializeApollo();

	try {
		// 2. Execute login mutation
		const result = await apolloClient.mutate({
			mutation: LOGIN,
			variables: { input: { memberNick: nick, memberPassword: password } },
			fetchPolicy: 'network-only', // Don't use cache, always fetch fresh
		});

		console.log('---------- login ----------');
		// 3. Extract accessToken from response
		const { accessToken } = result?.data?.login;

		return { jwtToken: accessToken };
	} catch (err: any) {
		// 4. Handle errors from server
		console.log('request token err', err.graphQLErrors);
		switch (err.graphQLErrors[0].message) {
			case 'Definer: login and password do not match':
				await sweetMixinErrorAlert('Please check your password again');
				break;
			case 'Definer: user has been blocked!':
				await sweetMixinErrorAlert('User has been blocked!');
				break;
		}
		throw new Error('token error');
	}
};

/** =============== signUp ===============*/
/** Purpose: Register new user and store JWT token */
export const signUp = async (nick: string, password: string, phone: string, type: string): Promise<void> => {
	try {
		// 1. Request JWT token from server after signup
		const { jwtToken } = await requestSignUpJwtToken({ nick, password, phone, type });

		// 2. If token received, store it and update user info
		if (jwtToken) {
			updateStorage({ jwtToken });
			updateUserInfo(jwtToken);
		}
	} catch (err) {
		// 3. Handle errors during signup process
		console.warn('login err', err);
		logOut(); // Clear any existing user data on error
		throw new Error('Login Err');
	}
};

/** =============== requestSignUpJwtToken ===============*/
/** Purpose: Request JWT token from server during signup */
const requestSignUpJwtToken = async ({
	nick,
	password,
	phone,
	type,
}: {
	nick: string;
	password: string;
	phone: string;
	type: string;
}): Promise<{ jwtToken: string }> => {
	// 1. Get Apollo Client instance
	const apolloClient = await initializeApollo();

	try {
		// 2. Execute signup mutation
		const result = await apolloClient.mutate({
			mutation: SIGN_UP,
			variables: {
				input: { memberNick: nick, memberPassword: password, memberPhone: phone, memberType: type },
			},
			fetchPolicy: 'network-only', // Don't use cache, always fetch fresh
		});

		console.log('---------- signup ----------');
		// 3. Extract accessToken from response
		const { accessToken } = result?.data?.signup;

		return { jwtToken: accessToken };
	} catch (err: any) {
		console.log('request token err', err.graphQLErrors);
		switch (err.graphQLErrors[0].message) {
			case 'Definer: login and password do not match':
				await sweetMixinErrorAlert('Please check your password again');
				break;
			case 'Definer: user has been blocked!':
				await sweetMixinErrorAlert('User has been blocked!');
				break;
		}
		throw new Error('token error');
	}
};

/** =============== updateStorage ===============*/
/** Purpose: Update localStorage with new JWT token and login timestamp */
export const updateStorage = ({ jwtToken }: { jwtToken: any }) => {
	// 1. Store JWT token in localStorage under 'accessToken' key
	setJwtToken(jwtToken);
	// 2. Update login timestamp to notify other tabs/windows
	window.localStorage.setItem('login', Date.now().toString());

	/** LocalStorage after login: {
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "login": "1675434567890"
} */
};

/** =============== updateUserInfo ===============*/
/** Purpose: Decode JWT token and update user information in Apollo Client state */
export const updateUserInfo = (jwtToken: any) => {
	if (!jwtToken) return false;

	const claims = decodeJWT<CustomJwtPayload>(jwtToken);
	userVar({
		_id: claims._id ?? '',
		memberType: claims.memberType ?? '',
		memberStatus: claims.memberStatus ?? '',
		memberAuthType: claims.memberAuthType,
		memberPhone: claims.memberPhone ?? '',
		memberNick: claims.memberNick ?? '',
		memberFullName: claims.memberFullName ?? '',
		memberImage:
			claims.memberImage === null || claims.memberImage === undefined
				? '/img/profile/defaultUser.svg'
				: `${claims.memberImage}`,
		memberAddress: claims.memberAddress ?? '',
		memberDesc: claims.memberDesc ?? '',
		memberProperties: claims.memberProperties,
		memberRank: claims.memberRank,
		memberArticles: claims.memberArticles,
		memberPoints: claims.memberPoints,
		memberLikes: claims.memberLikes,
		memberViews: claims.memberViews,
		memberWarnings: claims.memberWarnings,
		memberBlocks: claims.memberBlocks,
	});
};

/** =============== logOut ===============*/
/** Purpose: Log out user by clearing JWT token and user info */
export const logOut = () => {
	deleteStorage();
	deleteUserInfo();
	window.location.reload();
};

/** =============== deleteStorage ===============*/
/** Purpose: Remove JWT token from localStorage and notify other tabs/windows */
const deleteStorage = () => {
	// 1. Remove JWT token from localStorage under 'accessToken' key
	localStorage.removeItem('accessToken');
	// 2. Update logout timestamp to notify other tabs/windows
	window.localStorage.setItem('logout', Date.now().toString());
};

/** =============== deleteUserInfo ===============*/
/** Purpose: Clear user information from Apollo Client state */
const deleteUserInfo = () => {
	userVar({
		_id: '',
		memberType: '',
		memberStatus: '',
		memberAuthType: '',
		memberPhone: '',
		memberNick: '',
		memberFullName: '',
		memberImage: '',
		memberAddress: '',
		memberDesc: '',
		memberProperties: 0,
		memberRank: 0,
		memberArticles: 0,
		memberPoints: 0,
		memberLikes: 0,
		memberViews: 0,
		memberWarnings: 0,
		memberBlocks: 0,
	});
};

/**
 * Effect:

Updates userVar with empty/zero values
All components using useReactiveVar(userVar) re-render
{user?._id && <Chat />} becomes false → Chat disappears
Header shows "Login" button again
Protected routes redirect to login page
This is the inverse of updateUserInfo()
 */
