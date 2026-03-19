import api from './axiosInstance';

const BASE_URL = '/contact';

export const submitContactForm = async data => {
  try {
    // Wait for the promise to resolve
    const response = await api.post(`${BASE_URL}/submit`, data);

    // Now you will actually see the data!
    console.log('Response: ', response.data);

    return response;
  } catch (error) {
    console.error('Error submitting contact form: ', error);
    throw error;
  }
};
