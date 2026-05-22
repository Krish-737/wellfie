export type AlertSeverity = 'error' | 'warning';

export type AlertActionType =
  | 'retry'
  | 'prepare_guide'
  | 'dashboard'
  | 'profile'
  | 'support'
  | 'dismiss';

export interface AlertAction {
  type: AlertActionType;
  label: string;
}

export interface ResolvedAlert {
  code: number;
  severity: AlertSeverity;
  domain: string;
  name: string;
  title: string;
  message: string;
  actions: AlertAction[];
  /** Warnings that should not interrupt the user (e.g. 3506). */
  suppressDisplay?: boolean;
}

export interface AlertDefinition {
  code: number;
  name: string;
  domain: string;
  cause: string;
  solution: string;
}
