// Connector schemas modeled on each vendor's actual public API.
// Mock-mode by design: in production the wizards submit to a credential
// service. Here they validate shape and run a simulated test.

export type ConnectorField = {
  id: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'multi-select' | 'textarea' | 'derived';
  placeholder?: string;
  helperText?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  copyable?: boolean;
  mono?: boolean;
};

export type ConnectorStep = {
  id: string;
  title: string;
  subtitle?: string;
  // optional prerequisites checklist
  checklist?: { label: string; detail?: string; docsUrl?: string }[];
  // form fields collected on this step
  fields?: ConnectorField[];
  // commands/snippets shown verbatim
  snippet?: { language: string; code: string; caption?: string };
  // when true, this step runs the simulated test connection
  isTest?: boolean;
};

export type Connector = {
  id: string;
  name: string;
  vendor: string;
  category: 'cloud' | 'edr' | 'identity' | 'cmdb' | 'threat-intel' | 'network' | 'ot' | 'siem';
  // 1-line value prop for header
  tagline: string;
  // longer marketing line
  description: string;
  signalsProvided: string[];
  authMethod: string;
  estimatedSetup: string; // "3 minutes" etc.
  docsUrl: string;
  steps: ConnectorStep[];
};

const ALL_REGIONS_AWS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
];

export const CONNECTORS: Record<string, Connector> = {
  aws: {
    id: 'aws',
    name: 'AWS Organization',
    vendor: 'Amazon Web Services',
    category: 'cloud',
    tagline: 'Discover every account, VPC, workload, and identity across your AWS estate.',
    description:
      'Twin assumes a read-only IAM role in each AWS account to read Config snapshots, GuardDuty findings, IAM, and CloudTrail. Resources, relationships, and identity bindings are normalized into the graph.',
    signalsProvided: [
      'EC2, EKS, ECS, Lambda inventory',
      'VPC + subnet + security-group topology',
      'IAM roles, policies, trust relationships',
      'CloudTrail management events (last 90d)',
      'GuardDuty findings',
      'Config snapshots',
    ],
    authMethod: 'Cross-account IAM role',
    estimatedSetup: '4 minutes',
    docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html',
    steps: [
      {
        id: 'prereqs',
        title: 'Before you start',
        checklist: [
          {
            label: 'AWS Organizations enabled',
            detail: 'Twin reads from a delegated administrator account or directly from member accounts.',
          },
          {
            label: 'Admin access to the management account',
            detail: 'Required once to create the cross-account role and attach managed policies.',
          },
          {
            label: 'CloudTrail enabled in every region you will connect',
            detail: 'Twin reads management events from existing trails — it does not create a new trail.',
          },
        ],
      },
      {
        id: 'role',
        title: 'Create the read-only IAM role',
        subtitle:
          'Deploy this CloudFormation stack in the management account. Twin will assume the role using the External ID shown below.',
        fields: [
          {
            id: 'external_id',
            label: 'External ID (auto-generated for this tenant)',
            type: 'derived',
            mono: true,
            copyable: true,
            helperText: 'Paste this into the IAM trust policy as the sts:ExternalId condition.',
          },
        ],
        snippet: {
          language: 'yaml',
          caption: 'cloudformation/twin-readonly-role.yaml',
          code: `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  InfobloxTwinReadOnlyRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: InfobloxTwinReadOnly
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: arn:aws:iam::861234567890:role/twin-discovery-prod
            Action: sts:AssumeRole
            Condition:
              StringEquals:
                sts:ExternalId: \${ExternalId}
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/SecurityAudit
        - arn:aws:iam::aws:policy/job-function/ViewOnlyAccess
        - arn:aws:iam::aws:policy/AmazonGuardDutyReadOnlyAccess`,
        },
      },
      {
        id: 'connect',
        title: 'Connect',
        fields: [
          {
            id: 'account_id',
            label: 'AWS account ID',
            type: 'text',
            placeholder: '123456789012',
            required: true,
            mono: true,
          },
          {
            id: 'role_arn',
            label: 'Role ARN',
            type: 'text',
            placeholder: 'arn:aws:iam::123456789012:role/InfobloxTwinReadOnly',
            required: true,
            mono: true,
          },
          {
            id: 'regions',
            label: 'Regions to discover',
            type: 'multi-select',
            options: ALL_REGIONS_AWS.map((r) => ({ value: r, label: r })),
            required: true,
            helperText: 'Twin discovers cross-region resources. Add or remove regions any time.',
          },
        ],
      },
      {
        id: 'test',
        title: 'Test connection',
        subtitle: 'Twin assumes the role and reads a small sample to confirm permissions.',
        isTest: true,
      },
    ],
  },

  azure: {
    id: 'azure',
    name: 'Microsoft Azure + Entra ID',
    vendor: 'Microsoft',
    category: 'cloud',
    tagline:
      'Connect Twin to your Azure tenant for subscription, identity, and workload visibility.',
    description:
      'Twin connects via an Entra ID app registration using OAuth 2.0 client credentials. It reads Azure Resource Graph, Entra users and groups, and conditional-access policy state.',
    signalsProvided: [
      'Resource Graph: VMs, AKS, App Service, SQL, Storage',
      'Network: VNets, NSGs, peerings, private endpoints',
      'Entra: users, groups, app registrations, conditional access',
      'Defender for Cloud recommendations',
    ],
    authMethod: 'Entra ID app · client credentials',
    estimatedSetup: '5 minutes',
    docsUrl: 'https://learn.microsoft.com/azure/active-directory/develop/howto-create-service-principal-portal',
    steps: [
      {
        id: 'prereqs',
        title: 'Before you start',
        checklist: [
          {
            label: 'Global Administrator or Application Administrator',
            detail: 'Required once to register the app and grant admin consent.',
          },
          {
            label: 'Azure Resource Graph is enabled (default for all tenants)',
          },
        ],
      },
      {
        id: 'app',
        title: 'Register the Twin app',
        subtitle:
          'In Entra ID → App registrations → New registration. Name it "Infoblox Twin Discovery". Then add the Microsoft Graph and Azure Service Management API permissions below.',
        snippet: {
          language: 'json',
          caption: 'required-graph-permissions.json',
          code: `{
  "msgraph": [
    "Directory.Read.All",
    "Application.Read.All",
    "Policy.Read.All",
    "AuditLog.Read.All"
  ],
  "azure_service_management": [
    "user_impersonation (delegated)",
    "Reader (subscription-level role)"
  ]
}`,
        },
      },
      {
        id: 'connect',
        title: 'Connect',
        fields: [
          {
            id: 'tenant_id',
            label: 'Directory (tenant) ID',
            type: 'text',
            placeholder: '00000000-0000-0000-0000-000000000000',
            required: true,
            mono: true,
          },
          {
            id: 'client_id',
            label: 'Application (client) ID',
            type: 'text',
            placeholder: '00000000-0000-0000-0000-000000000000',
            required: true,
            mono: true,
          },
          {
            id: 'client_secret',
            label: 'Client secret',
            type: 'password',
            placeholder: 'Stored encrypted with envelope encryption (AWS KMS).',
            required: true,
          },
          {
            id: 'subscription_ids',
            label: 'Subscriptions',
            type: 'textarea',
            placeholder: 'One per line. Leave blank to discover all.',
            mono: true,
            helperText: 'Twin uses Reader role on each — no write access required.',
          },
        ],
      },
      {
        id: 'test',
        title: 'Test connection',
        subtitle:
          'Twin requests a token, calls Resource Graph and Graph API, and reports what it can see.',
        isTest: true,
      },
    ],
  },

  defender: {
    id: 'defender',
    name: 'Microsoft Defender for Endpoint',
    vendor: 'Microsoft',
    category: 'edr',
    tagline:
      'Stream device, alert, and vulnerability data from your Defender tenant into the Twin.',
    description:
      'Twin uses the Microsoft Graph Security and Defender for Endpoint APIs to pull machine inventory, alerts, software vulnerabilities, and recommendations.',
    signalsProvided: [
      'Machines (every onboarded device)',
      'Alerts and incidents',
      'Software inventory + vulnerabilities (per machine)',
      'Recommendations and exposure score',
    ],
    authMethod: 'Entra app · client credentials',
    estimatedSetup: '3 minutes',
    docsUrl: 'https://learn.microsoft.com/microsoft-365/security/defender-endpoint/api/exposed-apis-create-app-webapp',
    steps: [
      {
        id: 'prereqs',
        title: 'Before you start',
        checklist: [
          {
            label: 'Microsoft Defender for Endpoint P2 or Defender XDR license',
          },
          {
            label: 'An Entra ID app registration (you can reuse the Azure one)',
            detail: 'Add Defender-specific application permissions to it.',
          },
        ],
      },
      {
        id: 'permissions',
        title: 'Grant Defender application permissions',
        subtitle:
          'Add these to the app registration and grant tenant-wide admin consent.',
        snippet: {
          language: 'text',
          caption: 'WindowsDefenderATP application permissions',
          code: `Machine.Read.All
Alert.Read.All
Vulnerability.Read.All
SecurityRecommendation.Read.All
SecurityBaselineAssessment.Read.All`,
        },
      },
      {
        id: 'connect',
        title: 'Connect',
        fields: [
          {
            id: 'tenant_id',
            label: 'Tenant ID',
            type: 'text',
            placeholder: '00000000-0000-0000-0000-000000000000',
            required: true,
            mono: true,
          },
          {
            id: 'client_id',
            label: 'App (client) ID',
            type: 'text',
            placeholder: '00000000-0000-0000-0000-000000000000',
            required: true,
            mono: true,
          },
          {
            id: 'client_secret',
            label: 'Client secret',
            type: 'password',
            required: true,
          },
          {
            id: 'api_base',
            label: 'API base',
            type: 'select',
            required: true,
            options: [
              { value: 'commercial', label: 'Commercial (api.securitycenter.microsoft.com)' },
              { value: 'gcc', label: 'GCC (api-gcc.securitycenter.microsoft.us)' },
              { value: 'gcc-high', label: 'GCC High (api-gov.securitycenter.microsoft.us)' },
            ],
          },
        ],
      },
      { id: 'test', title: 'Test connection', isTest: true },
    ],
  },

  okta: {
    id: 'okta',
    name: 'Okta Workforce Identity',
    vendor: 'Okta',
    category: 'identity',
    tagline: 'Identity, MFA, and authentication context for every Twin asset.',
    description:
      'Twin reads users, groups, applications, and system-log events from Okta. MFA enforcement and assurance level land on every user node in the graph.',
    signalsProvided: [
      'Users, groups, application assignments',
      'MFA policies and factor inventory',
      'System log (90-day window)',
      'Sign-in risk + ThreatInsight',
    ],
    authMethod: 'API token (Okta admin)',
    estimatedSetup: '2 minutes',
    docsUrl: 'https://developer.okta.com/docs/guides/create-an-api-token/main/',
    steps: [
      {
        id: 'prereqs',
        title: 'Before you start',
        checklist: [
          {
            label: 'Okta Super Admin or Read-only Admin role',
            detail: 'Required to create the API token. Twin only needs read-only.',
          },
        ],
      },
      {
        id: 'token',
        title: 'Create the API token',
        subtitle:
          'In your Okta admin console: Security → API → Tokens → Create Token. Name it "Infoblox Twin".',
        snippet: {
          language: 'bash',
          caption: 'Quick test from your terminal (optional)',
          code: `curl -H "Authorization: SSWS $OKTA_TOKEN" \\
     "https://your-org.okta.com/api/v1/users?limit=1"`,
        },
      },
      {
        id: 'connect',
        title: 'Connect',
        fields: [
          {
            id: 'okta_domain',
            label: 'Okta domain',
            type: 'text',
            placeholder: 'acme.okta.com',
            required: true,
            mono: true,
          },
          {
            id: 'api_token',
            label: 'API token',
            type: 'password',
            required: true,
            helperText: 'Stored with envelope encryption. Rotate any time.',
          },
        ],
      },
      { id: 'test', title: 'Test connection', isTest: true },
    ],
  },

  crowdstrike: {
    id: 'crowdstrike',
    name: 'CrowdStrike Falcon',
    vendor: 'CrowdStrike',
    category: 'edr',
    tagline: 'Endpoint inventory and detections from your Falcon console.',
    description:
      'Twin uses the Falcon API with OAuth2 client credentials to pull hosts, detections, IOCs, and prevention policy posture per device.',
    signalsProvided: [
      'Hosts (every Falcon-installed device)',
      'Detections + incidents',
      'Custom IOCs',
      'Prevention policy assignments and posture',
    ],
    authMethod: 'OAuth2 client credentials',
    estimatedSetup: '3 minutes',
    docsUrl: 'https://falcon.crowdstrike.com/documentation/page/a2a7fc0e/crowdstrike-oauth2-based-apis',
    steps: [
      {
        id: 'prereqs',
        title: 'Before you start',
        checklist: [
          { label: 'CrowdStrike Falcon account · Administrator role' },
          {
            label: 'Falcon Insight or Prevent license',
            detail: 'Twin works with both — pulls whichever data your tier exposes.',
          },
        ],
      },
      {
        id: 'client',
        title: 'Create an API client',
        subtitle:
          'Support → API Clients and Keys → Add new API client. Select these scopes:',
        snippet: {
          language: 'text',
          caption: 'Required scopes (all read-only)',
          code: `Hosts: Read
Host Groups: Read
Detections: Read
Incidents: Read
IOC Manager: Read
Prevention Policies: Read
Sensor Update Policies: Read`,
        },
      },
      {
        id: 'connect',
        title: 'Connect',
        fields: [
          {
            id: 'client_id',
            label: 'Client ID',
            type: 'text',
            required: true,
            mono: true,
          },
          {
            id: 'client_secret',
            label: 'Client secret',
            type: 'password',
            required: true,
          },
          {
            id: 'cloud',
            label: 'Falcon cloud',
            type: 'select',
            required: true,
            options: [
              { value: 'us-1', label: 'US-1 (api.crowdstrike.com)' },
              { value: 'us-2', label: 'US-2 (api.us-2.crowdstrike.com)' },
              { value: 'eu-1', label: 'EU-1 (api.eu-1.crowdstrike.com)' },
              { value: 'us-gov-1', label: 'US-GOV-1 (api.laggar.gcw.crowdstrike.com)' },
            ],
          },
        ],
      },
      { id: 'test', title: 'Test connection', isTest: true },
    ],
  },

  infoblox_csp: {
    id: 'infoblox_csp',
    name: 'Infoblox CSP (Threat Defense, TIDE, SOC Insights)',
    vendor: 'Infoblox',
    category: 'threat-intel',
    tagline:
      'DNS-layer protection, curated threat intel, and DNS-query correlation tied to assets and users.',
    description:
      'Twin connects to the Infoblox Cloud Services Portal with a single API key. BloxOne Threat Defense detections, TIDE indicators, and SOC Insights — which correlates DNS query telemetry with assets and users — all flow in.',
    signalsProvided: [
      'BloxOne Threat Defense detections + policy posture',
      'TIDE indicators (curated by Infoblox Threat Intel)',
      'SOC Insights: DNS query ↔ asset ↔ user correlation',
      'NIOS DDI grid posture (via NIOS connector)',
    ],
    authMethod: 'CSP API key',
    estimatedSetup: '90 seconds',
    docsUrl: 'https://docs.infoblox.com/space/BloxOneCloud/35831811/Cloud+Services+Portal+API+Reference',
    steps: [
      {
        id: 'prereqs',
        title: 'Before you start',
        checklist: [
          {
            label: 'Infoblox CSP account · User Admin role',
            detail: 'Required to generate an API key.',
          },
        ],
      },
      {
        id: 'apikey',
        title: 'Generate the API key',
        subtitle:
          'CSP → User Profile → User API Keys → Create. Name it "Infoblox Twin" and set the rotation interval you prefer.',
        snippet: {
          language: 'bash',
          caption: 'Quick test from your terminal (optional)',
          code: `curl -H "Authorization: Token $CSP_TOKEN" \\
     "https://csp.infoblox.com/api/uai/v1/assets?_limit=1"`,
        },
      },
      {
        id: 'connect',
        title: 'Connect',
        fields: [
          {
            id: 'api_key',
            label: 'API key',
            type: 'password',
            required: true,
          },
          {
            id: 'region',
            label: 'CSP region',
            type: 'select',
            required: true,
            options: [
              { value: 'us', label: 'United States (csp.infoblox.com)' },
              { value: 'eu', label: 'Europe (csp.eu.infoblox.com)' },
            ],
          },
        ],
      },
      { id: 'test', title: 'Test connection', isTest: true },
    ],
  },

  servicenow: {
    id: 'servicenow',
    name: 'ServiceNow CMDB',
    vendor: 'ServiceNow',
    category: 'cmdb',
    tagline:
      'Anchor every Twin asset to its ServiceNow CI — owners, change history, support groups.',
    description:
      'Twin reads the cmdb_ci table and its relationship tables via the ServiceNow REST API. Resolved ownership flows back onto every asset in the graph.',
    signalsProvided: [
      'CI records (cmdb_ci and subclasses)',
      'CI relationships (cmdb_rel_ci)',
      'Assignment groups, support groups, owners',
      'Recent change records per CI',
    ],
    authMethod: 'OAuth 2.0 (preferred) or basic auth',
    estimatedSetup: '4 minutes',
    docsUrl: 'https://developer.servicenow.com/dev.do#!/reference/api/washingtondc/rest/c_TableAPI',
    steps: [
      {
        id: 'prereqs',
        title: 'Before you start',
        checklist: [
          {
            label: 'ServiceNow instance with REST API enabled (default)',
          },
          {
            label: 'A read-only service account with itil_read and cmdb_read roles',
            detail: 'Or use OAuth 2.0 — see step 2.',
          },
        ],
      },
      {
        id: 'oauth',
        title: 'Create the OAuth client (recommended)',
        subtitle:
          'In ServiceNow: System OAuth → Application Registry → New → Create an OAuth API endpoint for external clients.',
      },
      {
        id: 'connect',
        title: 'Connect',
        fields: [
          {
            id: 'instance_url',
            label: 'Instance URL',
            type: 'text',
            placeholder: 'https://acme.service-now.com',
            required: true,
            mono: true,
          },
          {
            id: 'auth',
            label: 'Auth method',
            type: 'select',
            required: true,
            options: [
              { value: 'oauth', label: 'OAuth 2.0 (recommended)' },
              { value: 'basic', label: 'Basic (service account)' },
            ],
          },
          {
            id: 'client_id',
            label: 'OAuth client ID',
            type: 'text',
            mono: true,
          },
          {
            id: 'client_secret',
            label: 'OAuth client secret',
            type: 'password',
          },
        ],
      },
      { id: 'test', title: 'Test connection', isTest: true },
    ],
  },
};

export const CONNECTOR_ORDER = [
  'aws',
  'azure',
  'defender',
  'okta',
  'crowdstrike',
  'infoblox_csp',
  'servicenow',
];
