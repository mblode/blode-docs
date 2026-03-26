import type {
  DeploymentStatus as ContractDeploymentStatus,
  DomainStatus as ContractDomainStatus,
} from "@repo/contracts";

import type { DeploymentStatus, DomainStatus } from "../schema";

const domainStatusToContract: Record<DomainStatus, ContractDomainStatus> = {
  invalid_configuration: "Invalid Configuration",
  pending_verification: "Pending Verification",
  valid_configuration: "Valid Configuration",
};

const domainStatusFromContract: Record<ContractDomainStatus, DomainStatus> = {
  "Invalid Configuration": "invalid_configuration",
  "Pending Verification": "pending_verification",
  "Valid Configuration": "valid_configuration",
};

const deploymentStatusToContract: Record<
  DeploymentStatus,
  ContractDeploymentStatus
> = {
  building: "Building",
  failed: "Failed",
  queued: "Queued",
  successful: "Successful",
};

const deploymentStatusFromContract: Record<
  ContractDeploymentStatus,
  DeploymentStatus
> = {
  Building: "building",
  Failed: "failed",
  Queued: "queued",
  Successful: "successful",
};

export const mapDomainStatusToContract = (
  status: DomainStatus
): ContractDomainStatus => domainStatusToContract[status];

export const mapDomainStatusFromContract = (
  status: ContractDomainStatus
): DomainStatus => domainStatusFromContract[status];

export const mapDeploymentStatusToContract = (
  status: DeploymentStatus
): ContractDeploymentStatus => deploymentStatusToContract[status];

export const mapDeploymentStatusFromContract = (
  status: ContractDeploymentStatus
): DeploymentStatus => deploymentStatusFromContract[status];
