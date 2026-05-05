import axios from 'axios';

export const fetchTMDBCredits = async (type: string, id: string) => {
    try {
        const response = await axios.get(`/api/tmdb/credits/${type}/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch TMDB credits:', error);
        return null;
    }
};
