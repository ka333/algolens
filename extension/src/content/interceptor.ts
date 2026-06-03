(function() {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = args[0];
    
    let urlString = '';
    if (typeof url === 'string') {
      urlString = url;
    } else if (url && typeof url === 'object') {
      if ('url' in url) {
        urlString = (url as any).url;
      } else if (typeof url.toString === 'function') {
        urlString = url.toString();
      }
    }

    if (urlString) {
      if (urlString.includes('/submissions/detail/') && urlString.includes('/check/')) {
        const clone = response.clone();
        clone.json().then(data => {
          window.postMessage({
            type: 'ALGOLENS_SUBMISSION_CHECK',
            data: data,
            url: urlString
          }, '*');
        }).catch(err => console.error('Error reading json check:', err));
      }
    }
    return response;
  };
})();
export {};
