import { auth } from '../app/config'; // Import Firebase auth (config vit dans app/config.ts)

const getAuthorization = async () => {
  const token = await auth.currentUser?.getIdToken();
  return token;
};

export { getAuthorization };
