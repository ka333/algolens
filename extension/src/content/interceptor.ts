(function() {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = args[0];
    
    if (typeof url === 'string') {
      if (url.includes('/submissions/detail/') && url.includes('/check/')) {
        const clone = response.clone();
        clone.json().then(data => {
          window.postMessage({
            type: 'ALGOLENS_SUBMISSION_CHECK',
            data: data,
            url: url
          }, '*');
        }).catch(err => console.error('Error reading json check:', err));
      }
    }
    return response;
  };
})();
export {};
