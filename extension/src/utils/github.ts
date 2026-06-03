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

function fromBase64(str: string): string {
  return decodeURIComponent(
    atob(str.replace(/\s/g, ''))
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
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

// Compile and push problem metadata
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

// Update README dynamically (Commit 28)
import { LocalStatsSummary } from './stats';

const generateREADMEStats = (stats: LocalStatsSummary, repo: string, folder: string): string => {
  const total = stats.easy + stats.medium + stats.hard;
  const recentHistory = stats.history.slice(0, 15);
  
  // Custom caching bust timestamp
  const ts = Date.now();
  const cardUrl = `https://algolens-backend.onrender.com/api/svg/stats?repo=${repo}&easy=${stats.easy}&medium=${stats.medium}&hard=${stats.hard}&streak=${stats.streak}&t=${ts}`;

  let markdown = `\n### AlgoLens Coding Stats

<p align="center">
  <img src="${cardUrl}" alt="AlgoLens Benchmarks" width="400" />
</p>

#### Progress Overview
- **Streaks**: ${stats.streak} 🔥
- **Total Problems Solved**: ${total}
- **Breakdown**: Easy: ${stats.easy} | Medium: ${stats.medium} | Hard: ${stats.hard}

#### Recent Solves
| Title | Difficulty | Language | Attempts | Solve Duration | Date |
| :--- | :---: | :---: | :---: | :---: | :--- |
`;

  recentHistory.forEach((item) => {
    const duration = item.solveTimeSeconds < 60 
      ? `${item.solveTimeSeconds}s` 
      : `${Math.floor(item.solveTimeSeconds / 60)}m ${item.solveTimeSeconds % 60}s`;
      
    markdown += `| [${item.title}](https://leetcode.com/problems/${item.slug}/) | ${item.difficulty} | ${item.language} | ${item.attempts} | ${duration} | ${new Date(item.solvedAt).toLocaleDateString()} |\n`;
  });

  return markdown + '\n';
};

export const updateRepositoryREADME = async (
  token: string,
  repo: string,
  folder: string,
  localStats: LocalStatsSummary
): Promise<string> => {
  const path = `${folder}/README.md`;
  
  const fileDetails = await getGitHubFileDetails(token, repo, path);
  let currentReadmeContent = '';
  let existingSha: string | null = null;

  if (fileDetails) {
    existingSha = fileDetails.sha;
    if (fileDetails.content) {
      currentReadmeContent = fromBase64(fileDetails.content);
    }
  } else {
    // Default README structure if none exists
    currentReadmeContent = `# LeetCode Solving Activity\n\nThis repository stores my LeetCode submissions synchronized automatically by AlgoLens.\n\n<!-- algolens:start -->\n<!-- algolens:end -->\n`;
  }

  const generatedSection = generateREADMEStats(localStats, repo, folder);
  
  // Regex insertion between tags
  const startMarker = '<!-- algolens:start -->';
  const endMarker = '<!-- algolens:end -->';
  
  const startIndex = currentReadmeContent.indexOf(startMarker);
  const endIndex = currentReadmeContent.indexOf(endMarker);

  let updatedReadme = '';
  if (startIndex !== -1 && endIndex !== -1) {
    updatedReadme = 
      currentReadmeContent.substring(0, startIndex + startMarker.length) +
      generatedSection +
      currentReadmeContent.substring(endIndex);
  } else {
    // If tags are not found, append them to the bottom
    updatedReadme = currentReadmeContent + `\n\n${startMarker}${generatedSection}${endMarker}\n`;
  }

  const commitMessage = `docs: update solving metrics and indexes in README.md`;
  
  return await createOrUpdateGitHubFile(
    token,
    repo,
    path,
    updatedReadme,
    existingSha,
    commitMessage
  );
};
