import { useMemo } from 'react';
import { ApolloClient, ApolloLink, InMemoryCache, split, from, NormalizedCacheObject } from '@apollo/client';
import createUploadLink from 'apollo-upload-client/public/createUploadLink.js';
import { WebSocketLink } from '@apollo/client/link/ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { onError } from '@apollo/client/link/error';
import { getJwtToken, logOut } from '../libs/auth';
import { TokenRefreshLink } from 'apollo-link-token-refresh';

// Singleton Apollo Client instance
let apolloClient: ApolloClient<NormalizedCacheObject>;

/** =============== getHeaders ===============*/
/** Purpose: Build HTTP headers with authentication token */
function getHeaders() {
	//1.Create empty headers object
	const headers = {} as HeadersInit;

	// 2. Get JWT token from localStorage (Retrieves token saved during login. Returns empty string if not logged in)
	const token = getJwtToken();
	// @ts-ignore
	// 3. If token exists, add Authorization header
	if (token) headers['Authorization'] = `Bearer ${token}`;

	// 4.Return headers object
	return headers;

	// Logged in user: { Authorization: 'Bearer <token>' }
	// Not logged in user: {}
}

/** =============== getHeaders ===============*/
/** Purpose: Auto-refresh JWT tokens before they expire */
const tokenRefreshLink = new TokenRefreshLink({
	accessTokenField: 'accessToken',
	isTokenValidOrUndefined: () => {
		return true;
	}, // @ts-ignore
	fetchAccessToken: () => {
		// execute refresh token
		return null;
	},
});

/** =============== createIsomorphicLink ===============*/
/** Purpose: Create appropriate link chain for client or server environment */
function createIsomorphicLink() {
	if (typeof window !== 'undefined') {
		// Purpose: Interceptor that adds authentication to all requests
		const authLink = new ApolloLink((operation, forward) => {
			// operation - The GraphQL query/mutation being sent, forward - Function to pass to next link in chain
			operation.setContext(({ headers = {} }) => ({
				headers: {
					...headers, // Keep existing headers
					...getHeaders(), // Add Authorization header
				},
			}));
			console.warn('requesting.. ', operation);

			// Pass operation to next link
			return forward(operation);

			/**
			 * Example:
			 * Before authLink:
			 * headers = { 'Content-Type': 'application/json' }
			 *
			 * After authLink (if logged in):
			 * headers = {
			 *   'Content-Type': 'application/json',
			 *   'Authorization': 'Bearer <token>'
			 * }
			 */
		});

		// @ts-ignore
		// Purpose: HTTP link for file uploads and standard requests
		const link = new createUploadLink({
			uri: process.env.REACT_APP_API_GRAPHQL_URL,

			/**
			 * Used for: Uploading property images, user avatars
			 */
		});

		/* WEBSOCKET SUBSCRIPTION LINK */
		const wsLink = new WebSocketLink({
			uri: process.env.REACT_APP_API_WS ?? 'ws://127.0.0.1:3007',
			options: {
				reconnect: false,
				timeout: 30000,
				connectionParams: () => {
					return { headers: getHeaders() };
				},
			},
		});

		// Purpose: Catch and handle errors from all GraphQL requests
		const errorLink = onError(({ graphQLErrors, networkError, response }) => {
			if (graphQLErrors) {
				graphQLErrors.map(({ message, locations, path, extensions }) =>
					console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`),
				);
			}
			if (networkError) console.log(`[Network error]: ${networkError}`);
			// @ts-ignore
			if (networkError?.statusCode === 401) {
				logOut();
				window.location.href = '/account/join';
			}
		});

		// Purpose: Route requests to WebSocket or HTTP based on operation type
		const splitLink = split(
			({ query }) => {
				const definition = getMainDefinition(query);
				return definition.kind === 'OperationDefinition' && definition.operation === 'subscription'; // Returns true/false
			},
			wsLink, // If true, use WebSocket link
			authLink.concat(link), // If false, use HTTP link with authentication
		);

		return from([errorLink, tokenRefreshLink, splitLink]);
	}
}

/** =============== createApolloClient ===============*/
/** Purpose: Instantiate Apollo Client with appropriate settings */
function createApolloClient() {
	return new ApolloClient({
		ssrMode: typeof window === 'undefined', // Purpose: Enable/disable server-side rendering mode (=== true on server, false in browser)
		link: createIsomorphicLink(),
		cache: new InMemoryCache(),
		resolvers: {},
	});
}

export function initializeApollo(initialState = null) {
	const _apolloClient = apolloClient ?? createApolloClient();
	if (initialState) _apolloClient.cache.restore(initialState); // Purpose: Hydrate cache with initial state (e.g. from server-side rendering)
	if (typeof window === 'undefined') return _apolloClient; // Purpose: On server, return immediately without saving to singleton
	if (!apolloClient) apolloClient = _apolloClient; // Purpose: Save client to global variable for reuse (browser only)

	return _apolloClient;
}

export function useApollo(initialState: any) {
	return useMemo(() => initializeApollo(initialState), [initialState]);
}

/**
import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";

// No Subscription required for develop process

const httpLink = createHttpLink({
  uri: "http://localhost:3007/graphql",
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

export default client;
*/

/**
 
ApolloClient - Main client class
ApolloLink - Middleware for request/response manipulation
InMemoryCache - Local cache for GraphQL data
split - Route requests to different links based on conditions
from - Combine multiple links into a chain
NormalizedCacheObject - TypeScript type for cache

import createUploadLink from 'apollo-upload-client/public/createUploadLink.js';
Purpose: Handle file uploads (images, documents)
Used for: Uploading property images, user avatars

import { WebSocketLink } from '@apollo/client/link/ws';
Purpose: Enable real-time subscriptions via WebSocket
Used for: Live chat, real-time notifications, live property updates

import { getMainDefinition } from '@apollo/client/utilities';
Purpose: Inspect GraphQL queries to determine their type
Used for: Deciding whether to use HTTP or WebSocket

import { onError } from '@apollo/client/link/error';
Purpose: Global error handler for GraphQL requests
Used for: Catching network errors, auth errors, logging

let apolloClient: ApolloClient<NormalizedCacheObject>;
Purpose: Store single instance of Apollo Client (Singleton pattern)
Why?
✅ Prevents creating multiple clients
✅ Maintains cache across components
✅ Improves performance
✅ Ensures consistent state
 */

/**
 * if (initialState) _apolloClient.cache.restore(initialState);
 * Purpose: Hydrate client-side cache with server-side data

What is cache hydration?

Server renders page with data
Server serializes Apollo cache to JSON
Client receives HTML + cache JSON
Client "restores" cache from JSON
Components use cached data (no loading state!)

SERVER SIDE (SSR):
┌─────────────────────────────────────┐
│ 1. Fetch data from database         │
│ 2. Render React to HTML             │
│ 3. Extract Apollo cache:            │
│    { Property:1: {...}, ... }       │
│ 4. Serialize to JSON                │
│ 5. Send HTML + cache to client      │
└─────────────────────────────────────┘
              ↓
CLIENT SIDE:
┌─────────────────────────────────────┐
│ 1. Receive HTML (renders instantly) │
│ 2. Initialize Apollo Client         │
│ 3. Restore cache from JSON          │ ← THIS LINE
│ 4. Components read from cache       │
│ 5. No loading spinners! ✅          │
└─────────────────────────────────────┘

Without cache restore: 
// Component renders
<PropertyList />
  ↓
// Shows loading...
<Spinner />
  ↓
// Fetches data from API
fetch('/graphql', { query: GET_PROPERTIES })
  ↓
// Finally shows data
<PropertyCard /> <PropertyCard /> <PropertyCard />

With cache restore:
// Component renders
<PropertyList />
  ↓
// Reads from cache (instant!)
_apolloClient.cache.restore(initialState)
  ↓
// Shows data immediately (no loading)
<PropertyCard /> <PropertyCard /> <PropertyCard />
 */

/**
 * if (typeof window === 'undefined') return _apolloClient;
 * Purpose: On server, return new Apollo Client instance without saving to singleton
 * 
 * Why?

Server environment:

Node.js (no window object)
Each request is isolated
Should NOT share client between requests
Security risk if shared (user A sees user B's data)
Client environment:

Browser (has window object)
Single user per browser
SHOULD share client across navigations
Cache persists between page changes

SERVER SIDE (Multiple concurrent requests):
┌──────────────────────────────────────────────┐
│ Request 1 (User A):                          │
│ initializeApollo()                           │
│ → Create client                              │
│ → Fetch User A's data                        │
│ → Return client (DON'T save to singleton)    │
│ → Client destroyed after response            │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Request 2 (User B):                          │
│ initializeApollo()                           │
│ → Create NEW client (isolated)               │
│ → Fetch User B's data                        │
│ → Return client (DON'T save to singleton)    │
│ → Client destroyed after response            │
└──────────────────────────────────────────────┘

if we saved to singleton on server:
// ❌ BAD - Security issue
Request 1: apolloClient = { cache: { user: 'Alice' } }
Request 2: apolloClient = { cache: { user: 'Alice' } } // User B sees Alice's data!

current implementation:
// ✅ GOOD - Isolated per request
Request 1: const client1 = createApolloClient(); // Isolated
Request 2: const client2 = createApolloClient(); // Isolated
 */

/**
 * Save to Singleton (Browser only)
 * if (!apolloClient) apolloClient = _apolloClient;
 * Purpose: Save Apollo Client instance to global variable for reuse in browser
 * 
 * Why?
 * // If singleton doesn't exist yet
if (!apolloClient) {
  // Save it for future calls
  apolloClient = _apolloClient;
}
	FIRST PAGE LOAD:
┌────────────────────────────────────────┐
│ Visit /                                │
│ initializeApollo() called              │
│ → apolloClient = undefined             │
│ → Create new client                    │
│ → Save to apolloClient variable ✅     │
└────────────────────────────────────────┘

NAVIGATION TO /property:
┌────────────────────────────────────────┐
│ Click link to /property                │
│ initializeApollo() called              │
│ → apolloClient = <existing client>     │
│ → Reuse existing client ✅             │
│ → if (!apolloClient) is false          │
│ → No reassignment needed               │
└────────────────────────────────────────┘

NAVIGATION TO /agent:
┌────────────────────────────────────────┐
│ Click link to /agent                   │
│ initializeApollo() called              │
│ → apolloClient = <existing client>     │
│ → Reuse same client ✅                 │
│ → Cache persists! 🎉                   │
└────────────────────────────────────────┘

Benefits:

Cache survives page navigation
Previously fetched data available instantly
No re-fetching on back/forward navigation

🎯 Summary
initializeApollo() does 3 things:

Create or reuse client (apolloClient ?? createApolloClient())
Hydrate cache from SSR (cache.restore(initialState))
Save to singleton in browser (if (!apolloClient) apolloClient = ...)
Mental model:

Server: "Create isolated client per request"
Browser (first load): "Create client and save it"
Browser (navigation): "Reuse saved client"
Browser (with SSR): "Create client + restore server data"
This ensures optimal performance, security, and user experience!
 */