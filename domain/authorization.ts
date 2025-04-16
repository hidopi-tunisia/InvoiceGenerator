import { auth } from '../config'; // Import Firebase auth

const getAuthorization = async () => {
  const token = await auth.currentUser?.getIdToken();
  return token;
};

export { getAuthorization };
