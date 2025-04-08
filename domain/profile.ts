import { ENDPOINT, HTTPMethod } from '../constants';
import { getAuthorization } from './authorization';

type CreateProfilePayload = {
  name: string;
  address: string;
  email: string;
};
const createProfile = async (payload: CreateProfilePayload) => {
  const token = await getAuthorization();
  const response = await fetch(`${ENDPOINT}/profile`, {
    method: HTTPMethod.POST,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    mode: 'cors',
    body: JSON.stringify(payload),
  });
  return response.json();
};

const getProfile = async () => {
  const token = await getAuthorization();
  const response = await fetch(`${ENDPOINT}/profile`, {
    method: HTTPMethod.GET,
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

type UpdateProfilePayload = {
  name?: string;
  address?: string;
  email?: string;
};
const updateProfile = async (payload: UpdateProfilePayload) => {
  const token = await getAuthorization();
  const response = await fetch(`${ENDPOINT}/profile`, {
    method: HTTPMethod.PATCH,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return response.json();
};

const removeProfile = async () => {
  const token = await getAuthorization();
  const response = await fetch(`${ENDPOINT}/profile`, {
    method: HTTPMethod.DELETE,
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

export {
  createProfile,
  getProfile,
  updateProfile,
  removeProfile,
};
