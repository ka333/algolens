(function() {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = args[0];
    const options = args[1];

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
      // 1. Intercept the submit code body (POST request)
      if (urlString.includes('/submit/')) {
        if (options && options.body) {
          try {
            const bodyData = JSON.parse(options.body.toString());
            if (bodyData && bodyData.typed_code) {
              window.postMessage({
                type: 'ALGOLENS_SUBMIT_CODE',
                code: bodyData.typed_code
              }, '*');
            }
          } catch (e) {
            console.error('AlgoLens: Error parsing submit request body:', e);
          }
        }
      }

      // 2. Intercept check polling responses
      if (urlString.includes('/submissions/detail/') && urlString.includes('/check/')) {
        const response = await originalFetch.apply(this, args);
        const clone = response.clone();
        clone.json().then(data => {
          window.postMessage({
            type: 'ALGOLENS_SUBMISSION_CHECK',
            data: data,
            url: urlString
          }, '*');
        }).catch(err => console.error('AlgoLens: Error reading json check:', err));
        return response;
      }
    }

    return originalFetch.apply(this, args);
  };
})();
export {};
