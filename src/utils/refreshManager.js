
export const markPageLoad = () => {
  sessionStorage.setItem('pageJustLoaded', 'true');
  sessionStorage.setItem('refreshAttempts', '0');
};

export const wasPageJustLoaded = () => {
  return sessionStorage.getItem('pageJustLoaded') === 'true';
};

export const clearPageLoadFlag = () => {
  sessionStorage.removeItem('pageJustLoaded');
  sessionStorage.removeItem('refreshAttempts');
};

export const incrementRefreshAttempts = () => {
  const currentAttempts = Number(sessionStorage.getItem('refreshAttempts') || '0');
  const newAttempts = currentAttempts + 1;
  sessionStorage.setItem('refreshAttempts', String(newAttempts));
  return newAttempts;
};

export const getRefreshAttempts = () => {
  return Number(sessionStorage.getItem('refreshAttempts') || '0');
}; 