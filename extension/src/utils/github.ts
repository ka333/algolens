export interface GitHubUser {
  login: string;
  avatar_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
}

// Fetch user profile to validate PAT and check for required scopes
export const validateGitHubToken = async (token: string): Promise<GitHubUser> => {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error('Invalid GitHub Personal Access Token');
  }

  const scopesHeader = response.headers.get('x-oauth-scopes') || '';
  const scopes = scopesHeader.split(',').map((s) => s.trim());
  
  if (!scopes.includes('repo')) {
    throw new Error('Token requires the "repo" scope to push solutions.');
  }

  const data = await response.json();
  return {
    login: data.login,
    avatar_url: data.avatar_url,
  };
};

// Fetch repository lists for authenticated user
export const fetchUserRepos = async (token: string): Promise<GitHubRepo[]> => {
  const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to retrieve repositories.');
  }

  const data = await response.json();
  return data.map((repo: any) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    private: repo.private,
  }));
};

// GET Git file details and SHA hashes
export interface GitHubFileDetails {
  sha: string;
  content?: string;
  encoding?: string;
}

export const getGitHubFileDetails = async (
  token: string,
  repo: string,
  path: string
): Promise<GitHubFileDetails | null> => {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch file details: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      sha: data.sha,
      content: data.content,
      encoding: data.encoding,
    };
  } catch (err) {
    console.error(`Error checking file ${path} on GitHub:`, err);
    return null;
  }
};

// Create or update a file on GitHub
function toBase64(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
}

export const createOrUpdateGitHubFile = async (
  token: string,
  repo: string,
  path: string,
  content: string,
  sha: string | null,
  message: string
): Promise<string> => {
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: toBase64(content),
      sha: sha || undefined,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to commit file ${path}`);
  }

  const data = await response.json();
  return data.content.sha;
};

// Compile and push problem metadata (Commit 27)
export interface ProblemMetadataPayload {
  slug: string;
  title: string;
  difficulty: string;
  tags: string[];
  language: string;
  runtime: string;
  memory: string;
  solveTimeSeconds: number;
  attempts: number;
  solvedAt: string;
}

export const pushProblemMetadataJSON = async (
  token: string,
  repo: string,
  folder: string,
  payload: ProblemMetadataPayload
): Promise<string> => {
  const path = `${folder}/data/${payload.slug}.json`;
  
  // Format the metadata JSON file neatly
  const metadataContent = JSON.stringify({
    title: payload.title,
    difficulty: payload.difficulty,
    tags: payload.tags,
    attempts: payload.attempts,
    solveTimeSeconds: payload.solveTimeSeconds,
    runtime: payload.runtime,
    memory: payload.memory,
    solvedAt: payload.solvedAt,
  }, null, 2);

  const fileDetails = await getGitHubFileDetails(token, repo, path);
  const existingSha = fileDetails ? fileDetails.sha : null;
  const commitMessage = `meta: store stats for ${payload.title} [data/${payload.slug}.json]`;

  return await createOrUpdateGitHubFile(
    token,
    repo,
    path,
    metadataContent,
    existingSha,
    commitMessage
  );
};
