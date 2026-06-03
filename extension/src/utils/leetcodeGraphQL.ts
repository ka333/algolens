export interface LeetCodeSubmission {
  id: string;
  statusDisplay: string;
  lang: string;
  title: string;
  titleSlug: string;
  timestamp: string; // Epoch timestamp string
}

export interface LeetCodeSubmissionDetails {
  code: string;
  runtime: string;
  memory: string;
  lang: {
    name: string;
    verboseName: string;
  };
  question: {
    questionId: string;
    title: string;
    titleSlug: string;
    difficulty: string;
    topicTags: { name: string }[];
  };
}

/**
 * Retrieve LeetCode's active csrftoken cookie.
 */
const getLeetCodeCsrfToken = (): Promise<string> => {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.cookies) {
      chrome.cookies.get({ url: 'https://leetcode.com', name: 'csrftoken' }, (cookie) => {
        resolve(cookie ? cookie.value : '');
      });
    } else {
      resolve('');
    }
  });
};

/**
 * Perform a GraphQL request to LeetCode with session credentials and CSRF tokens.
 */
async function queryLeetCodeGraphQL(query: string, variables: any = {}) {
  const csrfToken = await getLeetCodeCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Referer': 'https://leetcode.com',
  };

  if (csrfToken) {
    headers['x-csrftoken'] = csrfToken;
  }

  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`LeetCode GraphQL error: ${response.statusText}`);
  }

  const result = await response.json();
  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0].message || 'GraphQL Query Error');
  }

  return result.data;
}

/**
 * Fetch a page of user submissions.
 */
export const fetchSubmissions = async (
  offset: number = 0,
  limit: number = 20
): Promise<{ hasNext: boolean; submissions: LeetCodeSubmission[] }> => {
  const query = `
    query submissionList($offset: Int!, $limit: Int!) {
      submissionList(offset: $offset, limit: $limit) {
        lastKey
        hasNext
        submissions {
          id
          statusDisplay
          lang
          runtime
          timestamp
          title
          titleSlug
        }
      }
    }
  `;

  const data = await queryLeetCodeGraphQL(query, { offset, limit });
  const submissionList = data.submissionList;

  return {
    hasNext: submissionList.hasNext,
    submissions: submissionList.submissions || [],
  };
};

/**
 * Fetch full source code and problem metadata for a given submission ID.
 */
export const fetchSubmissionDetails = async (
  submissionId: string
): Promise<LeetCodeSubmissionDetails> => {
  const query = `
    query submissionDetails($submissionId: Int!) {
      submissionDetails(submissionId: $submissionId) {
        code
        runtime
        memory
        lang {
          name
          verboseName
        }
        question {
          questionId
          title
          titleSlug
          difficulty
          topicTags {
            name
          }
        }
      }
    }
  `;

  const idInt = parseInt(submissionId, 10);
  const data = await queryLeetCodeGraphQL(query, { submissionId: idInt });
  return data.submissionDetails;
};
