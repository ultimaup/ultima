
export const getToken = () => localStorage.getItem('token')
export const setToken = () => window.localStorage.setItem('token', auth.token)