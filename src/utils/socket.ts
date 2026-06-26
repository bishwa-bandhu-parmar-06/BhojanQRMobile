import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/env';
import { getToken } from './tokenStorage';

// Single shared connection for the whole app. Restaurant/Admin/Staff sockets
// auto-join their own room server-side from the JWT passed in the handshake
// `auth` payload (server/server.js reads socket.handshake.auth?.token);
// customers explicitly join an order's room instead (see useOrderSocket.ts).
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  auth: cb => cb({ token: getToken() }),
  transports: ['websocket'],
});
