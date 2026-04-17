import {
  DeploymentDao,
  DomainDao,
  GitConnectionDao,
  GithubInstallationDao,
  ProjectDao,
  UserDao,
} from "@repo/db";

export const projectDao = new ProjectDao();
export const domainDao = new DomainDao();
export const deploymentDao = new DeploymentDao();
export const userDao = new UserDao();
export const gitConnectionDao = new GitConnectionDao();
export const githubInstallationDao = new GithubInstallationDao();
