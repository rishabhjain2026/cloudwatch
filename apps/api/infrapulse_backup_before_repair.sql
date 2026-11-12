--
-- PostgreSQL database dump
--

\restrict NmY169zZye53unhTAnmGPIhtoYtJ461o1QFb3ohASguRGH6aAAGd2dD2IkfVN9T

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AgentStatus; Type: TYPE; Schema: public; Owner: infrapulse
--

CREATE TYPE public."AgentStatus" AS ENUM (
    'ACTIVE',
    'REVOKED',
    'PENDING'
);


ALTER TYPE public."AgentStatus" OWNER TO infrapulse;

--
-- Name: AlertStatus; Type: TYPE; Schema: public; Owner: infrapulse
--

CREATE TYPE public."AlertStatus" AS ENUM (
    'OPEN',
    'ACKNOWLEDGED',
    'RESOLVED'
);


ALTER TYPE public."AlertStatus" OWNER TO infrapulse;

--
-- Name: CostSource; Type: TYPE; Schema: public; Owner: infrapulse
--

CREATE TYPE public."CostSource" AS ENUM (
    'ESTIMATE',
    'AWS_CE'
);


ALTER TYPE public."CostSource" OWNER TO infrapulse;

--
-- Name: DeploymentStatus; Type: TYPE; Schema: public; Owner: infrapulse
--

CREATE TYPE public."DeploymentStatus" AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED',
    'ROLLED_BACK'
);


ALTER TYPE public."DeploymentStatus" OWNER TO infrapulse;

--
-- Name: IncidentStatus; Type: TYPE; Schema: public; Owner: infrapulse
--

CREATE TYPE public."IncidentStatus" AS ENUM (
    'DETECTED',
    'OPEN',
    'ACKNOWLEDGED',
    'INVESTIGATING',
    'RESOLVED',
    'CLOSED'
);


ALTER TYPE public."IncidentStatus" OWNER TO infrapulse;

--
-- Name: LogLevel; Type: TYPE; Schema: public; Owner: infrapulse
--

CREATE TYPE public."LogLevel" AS ENUM (
    'DEBUG',
    'INFO',
    'WARN',
    'ERROR',
    'FATAL'
);


ALTER TYPE public."LogLevel" OWNER TO infrapulse;

--
-- Name: MetricKind; Type: TYPE; Schema: public; Owner: infrapulse
--

CREATE TYPE public."MetricKind" AS ENUM (
    'CPU',
    'MEM',
    'DISK',
    'NET_IN',
    'NET_OUT',
    'LOAD',
    'TEMP',
    'STATUS_CHECK'
);


ALTER TYPE public."MetricKind" OWNER TO infrapulse;

--
-- Name: NotificationChannel; Type: TYPE; Schema: public; Owner: infrapulse
--

CREATE TYPE public."NotificationChannel" AS ENUM (
    'IN_APP',
    'EMAIL'
);


ALTER TYPE public."NotificationChannel" OWNER TO infrapulse;

--
-- Name: RemediationStatus; Type: TYPE; Schema: public; Owner: infrapulse
--

CREATE TYPE public."RemediationStatus" AS ENUM (
    'SUGGESTED',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'EXECUTING',
    'VERIFIED',
    'FAILED'
);


ALTER TYPE public."RemediationStatus" OWNER TO infrapulse;

--
-- Name: RoleName; Type: TYPE; Schema: public; Owner: infrapulse
--

CREATE TYPE public."RoleName" AS ENUM (
    'ADMIN',
    'VIEWER'
);


ALTER TYPE public."RoleName" OWNER TO infrapulse;

--
-- Name: ServerStatus; Type: TYPE; Schema: public; Owner: infrapulse
--

CREATE TYPE public."ServerStatus" AS ENUM (
    'HEALTHY',
    'WARNING',
    'CRITICAL',
    'OFFLINE',
    'UNKNOWN'
);


ALTER TYPE public."ServerStatus" OWNER TO infrapulse;

--
-- Name: Severity; Type: TYPE; Schema: public; Owner: infrapulse
--

CREATE TYPE public."Severity" AS ENUM (
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW'
);


ALTER TYPE public."Severity" OWNER TO infrapulse;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Agent; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."Agent" (
    id text NOT NULL,
    "serverId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "tokenPrefix" text NOT NULL,
    status public."AgentStatus" DEFAULT 'PENDING'::public."AgentStatus" NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    "lastSeenAt" timestamp(3) without time zone,
    "revokedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Agent" OWNER TO infrapulse;

--
-- Name: Alert; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."Alert" (
    id text NOT NULL,
    "ruleId" text,
    "serverId" text,
    "apiMonitorId" text,
    title text NOT NULL,
    description text,
    severity public."Severity" NOT NULL,
    status public."AlertStatus" DEFAULT 'OPEN'::public."AlertStatus" NOT NULL,
    "metricValue" double precision,
    threshold double precision,
    "isDemo" boolean DEFAULT false NOT NULL,
    "triggeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "ackAt" timestamp(3) without time zone,
    "ackById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Alert" OWNER TO infrapulse;

--
-- Name: AlertRule; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."AlertRule" (
    id text NOT NULL,
    name text NOT NULL,
    metric text NOT NULL,
    operator text NOT NULL,
    threshold double precision NOT NULL,
    severity public."Severity" NOT NULL,
    "cooldownSec" integer DEFAULT 300 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "isDemo" boolean DEFAULT false NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AlertRule" OWNER TO infrapulse;

--
-- Name: Anomaly; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."Anomaly" (
    id text NOT NULL,
    "serverId" text,
    "apiMonitorId" text,
    metric text NOT NULL,
    baseline double precision NOT NULL,
    actual double precision NOT NULL,
    "zScore" double precision,
    "detectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "relatedIncidentId" text,
    "isDemo" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Anomaly" OWNER TO infrapulse;

--
-- Name: ApiCheck; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."ApiCheck" (
    id text NOT NULL,
    "apiMonitorId" text NOT NULL,
    "statusCode" integer,
    "latencyMs" integer,
    success boolean NOT NULL,
    error text,
    "sslDaysRemaining" integer,
    "checkedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ApiCheck" OWNER TO infrapulse;

--
-- Name: ApiMonitor; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."ApiMonitor" (
    id text NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    method text DEFAULT 'GET'::text NOT NULL,
    "intervalSec" integer DEFAULT 60 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "isDemo" boolean DEFAULT false NOT NULL,
    "expectedStatus" integer DEFAULT 200 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ApiMonitor" OWNER TO infrapulse;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "actorId" text,
    action text NOT NULL,
    "resourceType" text NOT NULL,
    "resourceId" text,
    ip text,
    meta jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO infrapulse;

--
-- Name: AwsResource; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."AwsResource" (
    id text NOT NULL,
    "accountId" text NOT NULL,
    identity text NOT NULL,
    arn text,
    service text NOT NULL,
    "resourceType" text NOT NULL,
    "resourceId" text NOT NULL,
    name text,
    region text,
    status text,
    metadata jsonb,
    "lastDiscoveredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "missingSince" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AwsResource" OWNER TO infrapulse;

--
-- Name: AwsSyncRun; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."AwsSyncRun" (
    id text NOT NULL,
    status text NOT NULL,
    "coverageStatus" text NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "resourcesDiscovered" integer DEFAULT 0 NOT NULL,
    "resourcesCreated" integer DEFAULT 0 NOT NULL,
    "resourcesUpdated" integer DEFAULT 0 NOT NULL,
    "servicesQueried" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "serviceErrors" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "unsupportedResourceTypes" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "incompleteRegions" jsonb DEFAULT '[]'::jsonb NOT NULL,
    error text
);


ALTER TABLE public."AwsSyncRun" OWNER TO infrapulse;

--
-- Name: Deployment; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."Deployment" (
    id text NOT NULL,
    "appName" text NOT NULL,
    version text NOT NULL,
    environment text NOT NULL,
    status public."DeploymentStatus" DEFAULT 'PENDING'::public."DeploymentStatus" NOT NULL,
    "commitId" text,
    "commitMessage" text,
    "webhookSource" text,
    "isDemo" boolean DEFAULT false NOT NULL,
    "deployedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    meta jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Deployment" OWNER TO infrapulse;

--
-- Name: DockerContainer; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."DockerContainer" (
    id text NOT NULL,
    "serverId" text NOT NULL,
    "containerId" text NOT NULL,
    name text NOT NULL,
    image text,
    state text NOT NULL,
    health text,
    "cpuPercent" double precision,
    "memUsageMb" double precision,
    "restartCount" integer DEFAULT 0 NOT NULL,
    "startedAt" timestamp(3) without time zone,
    raw jsonb,
    "syncedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DockerContainer" OWNER TO infrapulse;

--
-- Name: DomainMonitor; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."DomainMonitor" (
    id text NOT NULL,
    domain text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "isDemo" boolean DEFAULT false NOT NULL,
    "lastStatus" text,
    "sslExpiresAt" timestamp(3) without time zone,
    "hostnameMatch" boolean,
    "httpStatus" integer,
    "checkedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DomainMonitor" OWNER TO infrapulse;

--
-- Name: Incident; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."Incident" (
    id text NOT NULL,
    "publicId" text NOT NULL,
    title text NOT NULL,
    description text,
    severity public."Severity" NOT NULL,
    status public."IncidentStatus" DEFAULT 'DETECTED'::public."IncidentStatus" NOT NULL,
    "assigneeId" text,
    "serverId" text,
    "isDemo" boolean DEFAULT false NOT NULL,
    "detectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "closedAt" timestamp(3) without time zone,
    "mttaMs" integer,
    "mttrMs" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Incident" OWNER TO infrapulse;

--
-- Name: IncidentAlert; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."IncidentAlert" (
    "incidentId" text NOT NULL,
    "alertId" text NOT NULL
);


ALTER TABLE public."IncidentAlert" OWNER TO infrapulse;

--
-- Name: IncidentEvent; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."IncidentEvent" (
    id text NOT NULL,
    "incidentId" text NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    meta jsonb,
    "actorId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."IncidentEvent" OWNER TO infrapulse;

--
-- Name: InfrastructureCost; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."InfrastructureCost" (
    id text NOT NULL,
    "serverId" text,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    "amountUsd" double precision NOT NULL,
    source public."CostSource" DEFAULT 'ESTIMATE'::public."CostSource" NOT NULL,
    breakdown jsonb,
    "isDemo" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."InfrastructureCost" OWNER TO infrapulse;

--
-- Name: LogEntry; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."LogEntry" (
    id text NOT NULL,
    "serverId" text,
    application text,
    level public."LogLevel" NOT NULL,
    message text NOT NULL,
    "maskedMessage" text NOT NULL,
    "incidentId" text,
    "isDemo" boolean DEFAULT false NOT NULL,
    "collectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LogEntry" OWNER TO infrapulse;

--
-- Name: MetricSample; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."MetricSample" (
    id text NOT NULL,
    "serverId" text NOT NULL,
    kind public."MetricKind" NOT NULL,
    value double precision NOT NULL,
    unit text DEFAULT '%'::text NOT NULL,
    meta jsonb,
    "collectedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MetricSample" OWNER TO infrapulse;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text,
    channel public."NotificationChannel" DEFAULT 'IN_APP'::public."NotificationChannel" NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    "readAt" timestamp(3) without time zone,
    meta jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO infrapulse;

--
-- Name: RemediationAction; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."RemediationAction" (
    id text NOT NULL,
    type text NOT NULL,
    "targetType" text NOT NULL,
    "targetId" text NOT NULL,
    status public."RemediationStatus" DEFAULT 'SUGGESTED'::public."RemediationStatus" NOT NULL,
    "requestedById" text,
    "approvedById" text,
    evidence jsonb,
    result jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "executedAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RemediationAction" OWNER TO infrapulse;

--
-- Name: Role; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."Role" (
    id text NOT NULL,
    name public."RoleName" NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Role" OWNER TO infrapulse;

--
-- Name: Server; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."Server" (
    id text NOT NULL,
    name text NOT NULL,
    hostname text,
    os text,
    environment text,
    region text,
    provider text,
    "ipAddress" text,
    status public."ServerStatus" DEFAULT 'UNKNOWN'::public."ServerStatus" NOT NULL,
    "isDemo" boolean DEFAULT false NOT NULL,
    "lastHeartbeatAt" timestamp(3) without time zone,
    "registeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "awsInstanceId" text,
    "awsState" text,
    "awsInstanceType" text,
    "awsAvailabilityZone" text,
    "awsLaunchTime" timestamp(3) without time zone,
    "awsSyncedAt" timestamp(3) without time zone,
    "publicIpAddress" text
);


ALTER TABLE public."Server" OWNER TO infrapulse;

--
-- Name: User; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    name text NOT NULL,
    "roleId" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO infrapulse;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: infrapulse
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO infrapulse;

--
-- Data for Name: Agent; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."Agent" (id, "serverId", "tokenHash", "tokenPrefix", status, permissions, "lastSeenAt", "revokedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Alert; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."Alert" (id, "ruleId", "serverId", "apiMonitorId", title, description, severity, status, "metricValue", threshold, "isDemo", "triggeredAt", "resolvedAt", "ackAt", "ackById", "createdAt", "updatedAt") FROM stdin;
cmwd8cgfv014ktsxkcnzrrqc7	cmwd8cgf5014etsxke8oy5rf3	cmwd8cg1y00k7tsxky2xplb37	\N	CPU above 85%	DEMO: Docker Worker CPU exceeded critical threshold.	CRITICAL	OPEN	94	85	t	2026-11-12 07:26:03.257	\N	\N	\N	2026-11-12 07:32:03.259	2026-11-12 07:32:03.259
cmwd8cggc014mtsxknfdupjgf	cmwd8cgfk014gtsxkj6pf65pg	cmwd8cfv7006ttsxkqnhqaq7s	\N	Memory above 90%	DEMO: Database Server memory pressure.	HIGH	ACKNOWLEDGED	91	90	t	2026-11-12 07:10:03.274	\N	2026-11-12 07:17:03.274	cmwd8cflr0003tsxkhfobpnha	2026-11-12 07:32:03.276	2026-11-12 07:32:03.276
cmwd8cggo014otsxkc9wepoio	\N	cmwd8cg8100qwtsxkkntno165	\N	API latency > 2s	DEMO: Payment API p95 latency elevated.	MEDIUM	OPEN	2400	2000	t	2026-11-12 06:51:03.287	\N	\N	\N	2026-11-12 07:32:03.289	2026-11-12 07:32:03.289
\.


--
-- Data for Name: AlertRule; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."AlertRule" (id, name, metric, operator, threshold, severity, "cooldownSec", enabled, "isDemo", "createdById", "createdAt", "updatedAt") FROM stdin;
cmwd8cgf5014etsxke8oy5rf3	CPU greater than 85%	CPU	gt	85	CRITICAL	300	t	t	cmwd8cflr0003tsxkhfobpnha	2026-11-12 07:32:03.233	2026-11-12 07:32:03.233
cmwd8cgfk014gtsxkj6pf65pg	Memory greater than 90%	MEM	gt	90	HIGH	300	t	t	cmwd8cflr0003tsxkhfobpnha	2026-11-12 07:32:03.248	2026-11-12 07:32:03.248
cmwd8cgfp014itsxk05h7fl49	Disk utilization greater than 90%	DISK	gt	90	HIGH	600	t	t	cmwd8cflr0003tsxkhfobpnha	2026-11-12 07:32:03.253	2026-11-12 07:32:03.253
\.


--
-- Data for Name: Anomaly; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."Anomaly" (id, "serverId", "apiMonitorId", metric, baseline, actual, "zScore", "detectedAt", "relatedIncidentId", "isDemo") FROM stdin;
cmwd8cgna017ptsxkklpu2xsb	cmwd8cg1y00k7tsxky2xplb37	\N	CPU	41.2	94	3.4	2026-11-12 07:32:03.526	cmwd8cggx014qtsxkvw8j2dbw	t
\.


--
-- Data for Name: ApiCheck; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."ApiCheck" (id, "apiMonitorId", "statusCode", "latencyMs", success, error, "sslDaysRemaining", "checkedAt") FROM stdin;
cmwd8cgjr0158tsxkhdvzdchs	cmwd8cgjd0157tsxk1n85ovmv	200	142	t	\N	\N	2026-11-12 02:32:03.397
cmwd8cgjr0159tsxkwx127pj5	cmwd8cgjd0157tsxk1n85ovmv	200	162	t	\N	\N	2026-11-12 02:47:03.397
cmwd8cgjr015atsxki9un0h0g	cmwd8cgjd0157tsxk1n85ovmv	200	182	t	\N	\N	2026-11-12 03:02:03.397
cmwd8cgjr015btsxkk2keayv8	cmwd8cgjd0157tsxk1n85ovmv	200	202	t	\N	\N	2026-11-12 03:17:03.397
cmwd8cgjr015ctsxkoxny0wmf	cmwd8cgjd0157tsxk1n85ovmv	200	222	t	\N	\N	2026-11-12 03:32:03.397
cmwd8cgjr015dtsxki0ar83h5	cmwd8cgjd0157tsxk1n85ovmv	200	142	t	\N	\N	2026-11-12 03:47:03.397
cmwd8cgjr015etsxk7m61q5nb	cmwd8cgjd0157tsxk1n85ovmv	200	162	t	\N	\N	2026-11-12 04:02:03.397
cmwd8cgjs015ftsxkumknd8x0	cmwd8cgjd0157tsxk1n85ovmv	200	182	t	\N	\N	2026-11-12 04:17:03.397
cmwd8cgjs015gtsxkl4e72vsq	cmwd8cgjd0157tsxk1n85ovmv	200	202	t	\N	\N	2026-11-12 04:32:03.397
cmwd8cgjs015htsxkwr9a3gt3	cmwd8cgjd0157tsxk1n85ovmv	200	222	t	\N	\N	2026-11-12 04:47:03.397
cmwd8cgjs015itsxkilogtjfu	cmwd8cgjd0157tsxk1n85ovmv	200	142	t	\N	\N	2026-11-12 05:02:03.397
cmwd8cgjs015jtsxkwcjyxbks	cmwd8cgjd0157tsxk1n85ovmv	200	162	t	\N	\N	2026-11-12 05:17:03.397
cmwd8cgjs015ktsxk7lfzwc4a	cmwd8cgjd0157tsxk1n85ovmv	200	182	t	\N	\N	2026-11-12 05:32:03.397
cmwd8cgjs015ltsxkxcqfpt3m	cmwd8cgjd0157tsxk1n85ovmv	200	202	t	\N	\N	2026-11-12 05:47:03.397
cmwd8cgjs015mtsxkupe2ppgk	cmwd8cgjd0157tsxk1n85ovmv	200	222	t	\N	\N	2026-11-12 06:02:03.397
cmwd8cgjs015ntsxkz9k5hi2i	cmwd8cgjd0157tsxk1n85ovmv	200	142	t	\N	\N	2026-11-12 06:17:03.397
cmwd8cgjs015otsxk94ngpqui	cmwd8cgjd0157tsxk1n85ovmv	200	162	t	\N	\N	2026-11-12 06:32:03.397
cmwd8cgjs015ptsxk3wmoa3vl	cmwd8cgjd0157tsxk1n85ovmv	200	182	t	\N	\N	2026-11-12 06:47:03.397
cmwd8cgjs015qtsxkqege1ioc	cmwd8cgjd0157tsxk1n85ovmv	200	202	t	\N	\N	2026-11-12 07:02:03.397
cmwd8cgjs015rtsxktachwhsl	cmwd8cgjd0157tsxk1n85ovmv	200	222	t	\N	\N	2026-11-12 07:17:03.397
cmwd8cgki015ttsxkvcu4n0j2	cmwd8cgkb015stsxk3yjc3mu4	200	210	t	\N	\N	2026-11-12 02:32:03.424
cmwd8cgki015utsxk0lumaz3b	cmwd8cgkb015stsxk3yjc3mu4	200	230	t	\N	\N	2026-11-12 02:47:03.424
cmwd8cgki015vtsxkd80ndxgz	cmwd8cgkb015stsxk3yjc3mu4	200	250	t	\N	\N	2026-11-12 03:02:03.424
cmwd8cgki015wtsxk8467uj8d	cmwd8cgkb015stsxk3yjc3mu4	200	270	t	\N	\N	2026-11-12 03:17:03.424
cmwd8cgki015xtsxkzavquxso	cmwd8cgkb015stsxk3yjc3mu4	200	290	t	\N	\N	2026-11-12 03:32:03.424
cmwd8cgki015ytsxk352fnacu	cmwd8cgkb015stsxk3yjc3mu4	200	210	t	\N	\N	2026-11-12 03:47:03.424
cmwd8cgki015ztsxky67j401i	cmwd8cgkb015stsxk3yjc3mu4	200	230	t	\N	\N	2026-11-12 04:02:03.424
cmwd8cgkj0160tsxkjuwecrjh	cmwd8cgkb015stsxk3yjc3mu4	200	250	t	\N	\N	2026-11-12 04:17:03.424
cmwd8cgkj0161tsxklpnryb0h	cmwd8cgkb015stsxk3yjc3mu4	200	270	t	\N	\N	2026-11-12 04:32:03.424
cmwd8cgkj0162tsxkwgozyemx	cmwd8cgkb015stsxk3yjc3mu4	200	290	t	\N	\N	2026-11-12 04:47:03.424
cmwd8cgkj0163tsxk9ccdydw4	cmwd8cgkb015stsxk3yjc3mu4	200	210	t	\N	\N	2026-11-12 05:02:03.424
cmwd8cgkj0164tsxkp9emd0ar	cmwd8cgkb015stsxk3yjc3mu4	200	230	t	\N	\N	2026-11-12 05:17:03.424
cmwd8cgkj0165tsxkoqobgok5	cmwd8cgkb015stsxk3yjc3mu4	200	250	t	\N	\N	2026-11-12 05:32:03.424
cmwd8cgkj0166tsxkib526lv2	cmwd8cgkb015stsxk3yjc3mu4	200	270	t	\N	\N	2026-11-12 05:47:03.424
cmwd8cgkj0167tsxkckqyiwum	cmwd8cgkb015stsxk3yjc3mu4	200	290	t	\N	\N	2026-11-12 06:02:03.424
cmwd8cgkj0168tsxktuqoczb7	cmwd8cgkb015stsxk3yjc3mu4	200	210	t	\N	\N	2026-11-12 06:17:03.424
cmwd8cgkj0169tsxk2zdtqm9d	cmwd8cgkb015stsxk3yjc3mu4	200	230	t	\N	\N	2026-11-12 06:32:03.424
cmwd8cgkj016atsxkw02uzxli	cmwd8cgkb015stsxk3yjc3mu4	200	250	t	\N	\N	2026-11-12 06:47:03.424
cmwd8cgkj016btsxk99dptkv2	cmwd8cgkb015stsxk3yjc3mu4	200	270	t	\N	\N	2026-11-12 07:02:03.424
cmwd8cgkj016ctsxk0eurhck6	cmwd8cgkb015stsxk3yjc3mu4	200	290	t	\N	\N	2026-11-12 07:17:03.424
cmwd8cgla016etsxk9scdr4dh	cmwd8cgl2016dtsxkjm1r3063	503	3200	f	\N	\N	2026-11-12 02:32:03.451
cmwd8cgla016ftsxkabr2g4we	cmwd8cgl2016dtsxkjm1r3063	200	1880	t	\N	\N	2026-11-12 02:47:03.451
cmwd8cgla016gtsxkoskkno6p	cmwd8cgl2016dtsxkjm1r3063	200	1900	t	\N	\N	2026-11-12 03:02:03.451
cmwd8cgla016htsxkr9zsc9lj	cmwd8cgl2016dtsxkjm1r3063	200	1920	t	\N	\N	2026-11-12 03:17:03.451
cmwd8cgla016itsxkud79zsk2	cmwd8cgl2016dtsxkjm1r3063	200	1940	t	\N	\N	2026-11-12 03:32:03.451
cmwd8cgla016jtsxknix7jp4n	cmwd8cgl2016dtsxkjm1r3063	200	1860	t	\N	\N	2026-11-12 03:47:03.451
cmwd8cgla016ktsxkt4zvs4hx	cmwd8cgl2016dtsxkjm1r3063	200	1880	t	\N	\N	2026-11-12 04:02:03.451
cmwd8cgla016ltsxkldloppb9	cmwd8cgl2016dtsxkjm1r3063	503	3200	f	\N	\N	2026-11-12 04:17:03.451
cmwd8cgla016mtsxkx4uhl80u	cmwd8cgl2016dtsxkjm1r3063	200	1920	t	\N	\N	2026-11-12 04:32:03.451
cmwd8cgla016ntsxkl9tactz4	cmwd8cgl2016dtsxkjm1r3063	200	1940	t	\N	\N	2026-11-12 04:47:03.451
cmwd8cgla016otsxkq61hi7u5	cmwd8cgl2016dtsxkjm1r3063	200	1860	t	\N	\N	2026-11-12 05:02:03.451
cmwd8cgla016ptsxkd18ognrd	cmwd8cgl2016dtsxkjm1r3063	200	1880	t	\N	\N	2026-11-12 05:17:03.451
cmwd8cgla016qtsxk9gl7rmxs	cmwd8cgl2016dtsxkjm1r3063	200	1900	t	\N	\N	2026-11-12 05:32:03.451
cmwd8cgla016rtsxkusc8yv8e	cmwd8cgl2016dtsxkjm1r3063	200	1920	t	\N	\N	2026-11-12 05:47:03.451
cmwd8cgla016stsxkaq1jynzj	cmwd8cgl2016dtsxkjm1r3063	503	3200	f	\N	\N	2026-11-12 06:02:03.451
cmwd8cgla016ttsxko4llpn4a	cmwd8cgl2016dtsxkjm1r3063	200	1860	t	\N	\N	2026-11-12 06:17:03.451
cmwd8cgla016utsxk1hth9s38	cmwd8cgl2016dtsxkjm1r3063	200	1880	t	\N	\N	2026-11-12 06:32:03.451
cmwd8cgla016vtsxkq2tcrvqp	cmwd8cgl2016dtsxkjm1r3063	200	1900	t	\N	\N	2026-11-12 06:47:03.451
cmwd8cgla016wtsxk5ihyp96z	cmwd8cgl2016dtsxkjm1r3063	200	1920	t	\N	\N	2026-11-12 07:02:03.451
cmwd8cgla016xtsxksgs84ckp	cmwd8cgl2016dtsxkjm1r3063	200	1940	t	\N	\N	2026-11-12 07:17:03.451
cmwd8cglt016ztsxkn3mk2a94	cmwd8cglm016ytsxkr690y190	200	118	t	\N	\N	2026-11-12 02:32:03.471
cmwd8cglu0170tsxkberdt0w5	cmwd8cglm016ytsxkr690y190	200	138	t	\N	\N	2026-11-12 02:47:03.471
cmwd8cglu0171tsxkgay5chgr	cmwd8cglm016ytsxkr690y190	200	158	t	\N	\N	2026-11-12 03:02:03.471
cmwd8cglu0172tsxksr07drnl	cmwd8cglm016ytsxkr690y190	200	178	t	\N	\N	2026-11-12 03:17:03.471
cmwd8cglu0173tsxk5edw9mwv	cmwd8cglm016ytsxkr690y190	200	198	t	\N	\N	2026-11-12 03:32:03.471
cmwd8cglu0174tsxkx357qlkn	cmwd8cglm016ytsxkr690y190	200	118	t	\N	\N	2026-11-12 03:47:03.471
cmwd8cglu0175tsxkr6oh5wsg	cmwd8cglm016ytsxkr690y190	200	138	t	\N	\N	2026-11-12 04:02:03.471
cmwd8cglu0176tsxk5orlvv11	cmwd8cglm016ytsxkr690y190	200	158	t	\N	\N	2026-11-12 04:17:03.471
cmwd8cglu0177tsxkkt6b0rv6	cmwd8cglm016ytsxkr690y190	200	178	t	\N	\N	2026-11-12 04:32:03.471
cmwd8cglu0178tsxkr8f58ndf	cmwd8cglm016ytsxkr690y190	200	198	t	\N	\N	2026-11-12 04:47:03.471
cmwd8cglu0179tsxkyazex2i1	cmwd8cglm016ytsxkr690y190	200	118	t	\N	\N	2026-11-12 05:02:03.471
cmwd8cglu017atsxkdfjafce3	cmwd8cglm016ytsxkr690y190	200	138	t	\N	\N	2026-11-12 05:17:03.471
cmwd8cglu017btsxk7mnn0qph	cmwd8cglm016ytsxkr690y190	200	158	t	\N	\N	2026-11-12 05:32:03.471
cmwd8cglu017ctsxkak8y54t9	cmwd8cglm016ytsxkr690y190	200	178	t	\N	\N	2026-11-12 05:47:03.471
cmwd8cglu017dtsxk6i85fo3d	cmwd8cglm016ytsxkr690y190	200	198	t	\N	\N	2026-11-12 06:02:03.471
cmwd8cglu017etsxkdy63whan	cmwd8cglm016ytsxkr690y190	200	118	t	\N	\N	2026-11-12 06:17:03.471
cmwd8cglu017ftsxk10kz2cfp	cmwd8cglm016ytsxkr690y190	200	138	t	\N	\N	2026-11-12 06:32:03.471
cmwd8cglu017gtsxk3apypstu	cmwd8cglm016ytsxkr690y190	200	158	t	\N	\N	2026-11-12 06:47:03.471
cmwd8cglu017htsxkl2lcjmvb	cmwd8cglm016ytsxkr690y190	200	178	t	\N	\N	2026-11-12 07:02:03.471
cmwd8cglu017itsxkj3z000oi	cmwd8cglm016ytsxkr690y190	200	198	t	\N	\N	2026-11-12 07:17:03.471
\.


--
-- Data for Name: ApiMonitor; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."ApiMonitor" (id, name, url, method, "intervalSec", enabled, "isDemo", "expectedStatus", "createdAt", "updatedAt") FROM stdin;
cmwd8cgjd0157tsxk1n85ovmv	Public Website	https://example.com	GET	60	t	t	200	2026-11-12 07:32:03.385	2026-11-12 07:32:03.385
cmwd8cgkb015stsxk3yjc3mu4	Core API	https://httpbin.org/status/200	GET	60	t	t	200	2026-11-12 07:32:03.42	2026-11-12 07:32:03.42
cmwd8cgl2016dtsxkjm1r3063	Payment API	https://httpbin.org/delay/2	GET	60	t	t	200	2026-11-12 07:32:03.446	2026-11-12 07:32:03.446
cmwd8cglm016ytsxkr690y190	Auth Service	https://httpbin.org/status/200	GET	60	t	t	200	2026-11-12 07:32:03.466	2026-11-12 07:32:03.466
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."AuditLog" (id, "actorId", action, "resourceType", "resourceId", ip, meta, "createdAt") FROM stdin;
cmwd8cgos017xtsxkhflaa78n	cmwd8cflr0003tsxkhfobpnha	SEED_COMPLETED	System	demo	\N	{"servers": 6}	2026-11-12 07:32:03.58
cmwd8cgos017ytsxkddtwpdld	cmwd8cflr0003tsxkhfobpnha	ALERT_ACKNOWLEDGED	Alert	cmwd8cggc014mtsxknfdupjgf	\N	\N	2026-11-12 07:32:03.58
cmwd8czis0001tsvcwze5sphx	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGIN	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 07:32:27.981
cmwd8efgi0001tsbccdlh3vlo	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGIN	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 07:33:35.294
cmwd8haic0003tsbcz9q6vl0e	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGOUT	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 07:35:48.844
cmwd8i0f00005tsbc82wch1ei	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGIN	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 07:36:22.422
cmwd8i20a0007tsbclo0au6a0	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGOUT	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 07:36:24.491
cmwd8k90v0009tsbcud0mfohd	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGIN	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 07:38:06.891
cmwd9pxkg0001tsrcag82e75j	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGOUT	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 08:10:31.595
cmwdec2se0001tsnce7aaxb8w	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGIN	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 10:19:43.259
cmwdfbht10001ts2ocratxtg9	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGOUT	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 10:47:15.682
cmwdfbna20003ts2ot85vqhc5	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGIN	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 10:47:22.779
cmwdixspr0001tsdsoz81ftcb	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGOUT	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 12:28:35.099
cmwdixyci0001tsrcny5bqxog	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGIN	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 12:28:42.402
cmwdj2vjh0001tsbsiq0qfvcw	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGOUT	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 12:32:32.043
cmwdj33yi0003tsbsctapaysm	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGIN	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 12:32:42.954
cmwdj9aam0003tsyk8gfxslsp	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGOUT	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 12:37:31.101
cmwdj9fxa0005tsyk1dug6f8f	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGIN	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 12:37:38.399
cmwdjda740001ts3czjxaznbd	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGOUT	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 12:40:37.598
cmwdjdgwk0003ts3cek9yxdxw	cmwd8cflr0003tsxkhfobpnha	AUTH_LOGIN	User	cmwd8cflr0003tsxkhfobpnha	::1	\N	2026-11-12 12:40:46.293
\.


--
-- Data for Name: AwsResource; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."AwsResource" (id, "accountId", identity, arn, service, "resourceType", "resourceId", name, region, status, metadata, "lastDiscoveredAt", "missingSince", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AwsSyncRun; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."AwsSyncRun" (id, status, "coverageStatus", "startedAt", "completedAt", "resourcesDiscovered", "resourcesCreated", "resourcesUpdated", "servicesQueried", "serviceErrors", "unsupportedResourceTypes", "incompleteRegions", error) FROM stdin;
\.


--
-- Data for Name: Deployment; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."Deployment" (id, "appName", version, environment, status, "commitId", "commitMessage", "webhookSource", "isDemo", "deployedAt", meta, "createdAt") FROM stdin;
cmwd8cgm7017jtsxkqzon6dgr	payment-api	v2.4.1	production	SUCCESS	a1b2c3d	Improve checkout retry budget	demo	t	2026-11-12 05:32:03.485	\N	2026-11-12 07:32:03.488
cmwd8cgm7017ktsxk4discgma	worker	v1.9.0	production	SUCCESS	e4f5a6b	Tune queue concurrency	demo	t	2026-11-12 02:32:03.485	\N	2026-11-12 07:32:03.488
\.


--
-- Data for Name: DockerContainer; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."DockerContainer" (id, "serverId", "containerId", name, image, state, health, "cpuPercent", "memUsageMb", "restartCount", "startedAt", raw, "syncedAt", "createdAt", "updatedAt") FROM stdin;
cmwd8cgek014atsxk4dyxk2wk	cmwd8cg1y00k7tsxky2xplb37	democtr01	queue-consumer	infrapulse/demo-worker:1.9.0	running	unhealthy	88.2	1450	3	2026-11-12 00:32:03.21	\N	2026-11-12 07:32:03.212	2026-11-12 07:32:03.212	2026-11-12 07:32:03.212
cmwd8cgek014btsxktv7oebqs	cmwd8cg1y00k7tsxky2xplb37	democtr02	log-shipper	infrapulse/demo-shipper:0.4.1	running	healthy	6.1	220	0	2026-11-09 07:32:03.21	\N	2026-11-12 07:32:03.212	2026-11-12 07:32:03.212	2026-11-12 07:32:03.212
cmwd8cgek014ctsxkl2aoz7d1	cmwd8cfnr0004tsxk7ea7fsoi	democtr03	api-gateway	infrapulse/demo-api:2.4.1	running	healthy	21.4	640	1	2026-10-31 07:32:03.21	\N	2026-11-12 07:32:03.212	2026-11-12 07:32:03.212	2026-11-12 07:32:03.212
\.


--
-- Data for Name: DomainMonitor; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."DomainMonitor" (id, domain, enabled, "isDemo", "lastStatus", "sslExpiresAt", "hostnameMatch", "httpStatus", "checkedAt", "createdAt", "updatedAt") FROM stdin;
cmwd8cgnq017qtsxks63sq87z	demo.infrapulse.dev	t	t	up	2026-12-27 07:32:03.54	t	200	2026-11-12 07:32:03.54	2026-11-12 07:32:03.542	2026-11-12 07:32:03.542
\.


--
-- Data for Name: Incident; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."Incident" (id, "publicId", title, description, severity, status, "assigneeId", "serverId", "isDemo", "detectedAt", "resolvedAt", "closedAt", "mttaMs", "mttrMs", "createdAt", "updatedAt") FROM stdin;
cmwd8cggx014qtsxkvw8j2dbw	INC-1042	Worker node resource saturation	DEMO incident grouped from CPU saturation alerts on Docker Worker.	CRITICAL	INVESTIGATING	cmwd8cflr0003tsxkhfobpnha	cmwd8cg1y00k7tsxky2xplb37	t	2026-11-12 07:14:03.294	\N	\N	\N	\N	2026-11-12 07:32:03.297	2026-11-12 07:32:03.297
cmwd8cgif014wtsxkn4rfdxmo	INC-1041	Elevated payment API latency	DEMO: latency and error-rate correlation under review.	HIGH	ACKNOWLEDGED	cmwd8cflr0003tsxkhfobpnha	cmwd8cg8100qwtsxkkntno165	t	2026-11-12 06:32:03.35	\N	\N	480000	\N	2026-11-12 07:32:03.352	2026-11-12 07:32:03.352
cmwd8cgix0152tsxkfwvdy73l	INC-1038	Staging deploy health flap	DEMO: resolved after rollback window.	MEDIUM	RESOLVED	\N	cmwd8cfyr00ditsxkig9uqeve	t	2026-11-11 05:32:03.367	2026-11-11 11:32:03.367	\N	300000	21600000	2026-11-12 07:32:03.369	2026-11-12 07:32:03.369
\.


--
-- Data for Name: IncidentAlert; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."IncidentAlert" ("incidentId", "alertId") FROM stdin;
cmwd8cggx014qtsxkvw8j2dbw	cmwd8cgfv014ktsxkcnzrrqc7
cmwd8cgif014wtsxkn4rfdxmo	cmwd8cggo014otsxkc9wepoio
\.


--
-- Data for Name: IncidentEvent; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."IncidentEvent" (id, "incidentId", type, message, meta, "actorId", "createdAt") FROM stdin;
cmwd8cggx014stsxkr4ftflp0	cmwd8cggx014qtsxkvw8j2dbw	DETECTED	Incident opened from critical CPU alert.	\N	\N	2026-11-12 07:32:03.297
cmwd8cggx014ttsxkn9fz09pg	cmwd8cggx014qtsxkvw8j2dbw	ACKNOWLEDGED	Administrator acknowledged incident.	\N	cmwd8cflr0003tsxkhfobpnha	2026-11-12 07:32:03.297
cmwd8cggx014utsxkd2cacd8y	cmwd8cggx014qtsxkvw8j2dbw	INVESTIGATING	Correlating container restarts and recent deployment.	\N	cmwd8cflr0003tsxkhfobpnha	2026-11-12 07:32:03.297
cmwd8cgig014ztsxkc0a8s8c2	cmwd8cgif014wtsxkn4rfdxmo	DETECTED	Latency alert escalated to incident.	\N	\N	2026-11-12 07:32:03.352
cmwd8cgig0150tsxkid4njsbh	cmwd8cgif014wtsxkn4rfdxmo	ACKNOWLEDGED	On-call acknowledged.	\N	cmwd8cflr0003tsxkhfobpnha	2026-11-12 07:32:03.352
cmwd8cgix0155tsxkyd8bq277	cmwd8cgix0152tsxkfwvdy73l	DETECTED	Health check flaps detected.	\N	\N	2026-11-12 07:32:03.369
cmwd8cgix0156tsxkjyx3i4fm	cmwd8cgix0152tsxkfwvdy73l	RESOLVED	Service stabilized.	\N	cmwd8cflr0003tsxkhfobpnha	2026-11-12 07:32:03.369
\.


--
-- Data for Name: InfrastructureCost; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."InfrastructureCost" (id, "serverId", "periodStart", "periodEnd", "amountUsd", source, breakdown, "isDemo", "createdAt") FROM stdin;
cmwd8cgo7017rtsxka0ws0bq3	cmwd8cfnr0004tsxk7ea7fsoi	2026-10-31 18:30:00	2026-11-29 18:30:00	77	ESTIMATE	{"note": "Labeled estimate for DEMO — not AWS billing."}	t	2026-11-12 07:32:03.56
cmwd8cgo7017stsxkq19cbvzp	cmwd8cfv7006ttsxkqnhqaq7s	2026-10-31 18:30:00	2026-11-29 18:30:00	105.33	ESTIMATE	{"note": "Labeled estimate for DEMO — not AWS billing."}	t	2026-11-12 07:32:03.56
cmwd8cgo8017ttsxkfnmnva45	cmwd8cfyr00ditsxkig9uqeve	2026-10-31 18:30:00	2026-11-29 18:30:00	64.67	ESTIMATE	{"note": "Labeled estimate for DEMO — not AWS billing."}	t	2026-11-12 07:32:03.56
cmwd8cgo8017utsxkk8e9izof	cmwd8cg1y00k7tsxky2xplb37	2026-10-31 18:30:00	2026-11-29 18:30:00	117.33	ESTIMATE	{"note": "Labeled estimate for DEMO — not AWS billing."}	t	2026-11-12 07:32:03.56
cmwd8cgo8017vtsxkcl3kha8v	cmwd8cg8100qwtsxkkntno165	2026-10-31 18:30:00	2026-11-29 18:30:00	92.33	ESTIMATE	{"note": "Labeled estimate for DEMO — not AWS billing."}	t	2026-11-12 07:32:03.56
cmwd8cgo8017wtsxkis9uksxd	cmwd8cgbc00xltsxk8nrjqefz	2026-10-31 18:30:00	2026-11-29 18:30:00	61	ESTIMATE	{"note": "Labeled estimate for DEMO — not AWS billing."}	t	2026-11-12 07:32:03.56
\.


--
-- Data for Name: LogEntry; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."LogEntry" (id, "serverId", application, level, message, "maskedMessage", "incidentId", "isDemo", "collectedAt", "createdAt") FROM stdin;
cmwd8cgmp017ltsxkiuh09jqe	cmwd8cg1y00k7tsxky2xplb37	queue-consumer	ERROR	Worker stalled: CPU starvation (token=super-secret-should-mask)	Worker stalled: CPU starvation (token=***MASKED***)	cmwd8cggx014qtsxkvw8j2dbw	t	2026-11-12 07:22:03.503	2026-11-12 07:32:03.505
cmwd8cgmp017mtsxkqb4jckly	cmwd8cg8100qwtsxkkntno165	payment-api	WARN	Upstream latency budget exceeded	Upstream latency budget exceeded	\N	t	2026-11-12 06:57:03.503	2026-11-12 07:32:03.505
cmwd8cgmp017ntsxkaor1y4kz	cmwd8cfnr0004tsxk7ea7fsoi	api-gateway	INFO	Deployment health checks passed	Deployment health checks passed	\N	t	2026-11-12 05:32:03.503	2026-11-12 07:32:03.505
\.


--
-- Data for Name: MetricSample; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."MetricSample" (id, "serverId", kind, value, unit, meta, "collectedAt", "createdAt") FROM stdin;
cmwd8cfpe0005tsxkaf03t1jg	cmwd8cfnr0004tsxk7ea7fsoi	CPU	36.2	%	\N	2026-11-11 07:32:02.283	2026-11-12 07:32:02.304
cmwd8cfpe0006tsxk6ox0vg25	cmwd8cfnr0004tsxk7ea7fsoi	CPU	39.6	%	\N	2026-11-11 08:02:40.58	2026-11-12 07:32:02.304
cmwd8cfpe0007tsxkipopgpkh	cmwd8cfnr0004tsxk7ea7fsoi	CPU	42.9	%	\N	2026-11-11 08:33:18.878	2026-11-12 07:32:02.304
cmwd8cfpe0008tsxky2bp3bkw	cmwd8cfnr0004tsxk7ea7fsoi	CPU	41.6	%	\N	2026-11-11 09:03:57.176	2026-11-12 07:32:02.304
cmwd8cfpe0009tsxkf9z8d2rc	cmwd8cfnr0004tsxk7ea7fsoi	CPU	44	%	\N	2026-11-11 09:34:35.474	2026-11-12 07:32:02.304
cmwd8cfpe000atsxkohg0d8k3	cmwd8cfnr0004tsxk7ea7fsoi	CPU	41.8	%	\N	2026-11-11 10:05:13.772	2026-11-12 07:32:02.304
cmwd8cfpe000btsxkurvni15s	cmwd8cfnr0004tsxk7ea7fsoi	CPU	43.2	%	\N	2026-11-11 10:35:52.07	2026-11-12 07:32:02.304
cmwd8cfpe000ctsxk989ye4nj	cmwd8cfnr0004tsxk7ea7fsoi	CPU	40	%	\N	2026-11-11 11:06:30.368	2026-11-12 07:32:02.304
cmwd8cfpe000dtsxkn0srpr4o	cmwd8cfnr0004tsxk7ea7fsoi	CPU	40.5	%	\N	2026-11-11 11:37:08.665	2026-11-12 07:32:02.304
cmwd8cfpe000etsxk06cn1uly	cmwd8cfnr0004tsxk7ea7fsoi	CPU	40.9	%	\N	2026-11-11 12:07:46.963	2026-11-12 07:32:02.304
cmwd8cfpe000ftsxkasl3u64v	cmwd8cfnr0004tsxk7ea7fsoi	CPU	36.9	%	\N	2026-11-11 12:38:25.261	2026-11-12 07:32:02.304
cmwd8cfpe000gtsxkrymhl5qx	cmwd8cfnr0004tsxk7ea7fsoi	CPU	37.3	%	\N	2026-11-11 13:09:03.559	2026-11-12 07:32:02.304
cmwd8cfpe000htsxkvjvx9iol	cmwd8cfnr0004tsxk7ea7fsoi	CPU	33.7	%	\N	2026-11-11 13:39:41.857	2026-11-12 07:32:02.304
cmwd8cfpe000itsxkvj5f7psm	cmwd8cfnr0004tsxk7ea7fsoi	CPU	34.7	%	\N	2026-11-11 14:10:20.155	2026-11-12 07:32:02.304
cmwd8cfpe000jtsxk8n1a9sny	cmwd8cfnr0004tsxk7ea7fsoi	CPU	32	%	\N	2026-11-11 14:40:58.453	2026-11-12 07:32:02.304
cmwd8cfpe000ktsxk751sx373	cmwd8cfnr0004tsxk7ea7fsoi	CPU	34	%	\N	2026-11-11 15:11:36.751	2026-11-12 07:32:02.304
cmwd8cfpe000ltsxk7zmh8t3e	cmwd8cfnr0004tsxk7ea7fsoi	CPU	36.6	%	\N	2026-11-11 15:42:15.048	2026-11-12 07:32:02.304
cmwd8cfpe000mtsxkwkfxup2v	cmwd8cfnr0004tsxk7ea7fsoi	CPU	35.3	%	\N	2026-11-11 16:12:53.346	2026-11-12 07:32:02.304
cmwd8cfpe000ntsxkbdv10tjf	cmwd8cfnr0004tsxk7ea7fsoi	CPU	38.6	%	\N	2026-11-11 16:43:31.644	2026-11-12 07:32:02.304
cmwd8cfpe000otsxkz43ynakc	cmwd8cfnr0004tsxk7ea7fsoi	CPU	37.8	%	\N	2026-11-11 17:14:09.942	2026-11-12 07:32:02.304
cmwd8cfpe000ptsxkbkd58wh8	cmwd8cfnr0004tsxk7ea7fsoi	CPU	41.2	%	\N	2026-11-11 17:44:48.24	2026-11-12 07:32:02.304
cmwd8cfpe000qtsxkfaz020x0	cmwd8cfnr0004tsxk7ea7fsoi	CPU	40.2	%	\N	2026-11-11 18:15:26.538	2026-11-12 07:32:02.304
cmwd8cfpe000rtsxk8v03mrwe	cmwd8cfnr0004tsxk7ea7fsoi	CPU	43.1	%	\N	2026-11-11 18:46:04.836	2026-11-12 07:32:02.304
cmwd8cfpe000stsxkjvm1nqrn	cmwd8cfnr0004tsxk7ea7fsoi	CPU	45.5	%	\N	2026-11-11 19:16:43.134	2026-11-12 07:32:02.304
cmwd8cfpe000ttsxk176nz6il	cmwd8cfnr0004tsxk7ea7fsoi	CPU	43.1	%	\N	2026-11-11 19:47:21.431	2026-11-12 07:32:02.304
cmwd8cfpe000utsxkdf6wul1w	cmwd8cfnr0004tsxk7ea7fsoi	CPU	44.5	%	\N	2026-11-11 20:17:59.729	2026-11-12 07:32:02.304
cmwd8cfpe000vtsxkzebgfrs7	cmwd8cfnr0004tsxk7ea7fsoi	CPU	41.2	%	\N	2026-11-11 20:48:38.027	2026-11-12 07:32:02.304
cmwd8cfpf000wtsxksz4l58ih	cmwd8cfnr0004tsxk7ea7fsoi	CPU	41.7	%	\N	2026-11-11 21:19:16.325	2026-11-12 07:32:02.304
cmwd8cfpf000xtsxk54a5flfu	cmwd8cfnr0004tsxk7ea7fsoi	CPU	37.8	%	\N	2026-11-11 21:49:54.623	2026-11-12 07:32:02.304
cmwd8cfpf000ytsxkzsncrtlq	cmwd8cfnr0004tsxk7ea7fsoi	CPU	38.1	%	\N	2026-11-11 22:20:32.921	2026-11-12 07:32:02.304
cmwd8cfpf000ztsxkryziq9j7	cmwd8cfnr0004tsxk7ea7fsoi	CPU	38.4	%	\N	2026-11-11 22:51:11.219	2026-11-12 07:32:02.304
cmwd8cfpf0010tsxkbexd9h77	cmwd8cfnr0004tsxk7ea7fsoi	CPU	34.9	%	\N	2026-11-11 23:21:49.517	2026-11-12 07:32:02.304
cmwd8cfpf0011tsxk3rp2b5ku	cmwd8cfnr0004tsxk7ea7fsoi	CPU	36	%	\N	2026-11-11 23:52:27.814	2026-11-12 07:32:02.304
cmwd8cfpf0012tsxk9ejewn9f	cmwd8cfnr0004tsxk7ea7fsoi	CPU	33.4	%	\N	2026-11-12 00:23:06.112	2026-11-12 07:32:02.304
cmwd8cfpf0013tsxkfg9tfsxv	cmwd8cfnr0004tsxk7ea7fsoi	CPU	35.5	%	\N	2026-11-12 00:53:44.41	2026-11-12 07:32:02.304
cmwd8cfpf0014tsxktrzdp41w	cmwd8cfnr0004tsxk7ea7fsoi	CPU	33.9	%	\N	2026-11-12 01:24:22.708	2026-11-12 07:32:02.304
cmwd8cfpf0015tsxkrvr60jd0	cmwd8cfnr0004tsxk7ea7fsoi	CPU	36.9	%	\N	2026-11-12 01:55:01.006	2026-11-12 07:32:02.304
cmwd8cfpf0016tsxk7dovxcbs	cmwd8cfnr0004tsxk7ea7fsoi	CPU	40.2	%	\N	2026-11-12 02:25:39.304	2026-11-12 07:32:02.304
cmwd8cfpf0017tsxk4b0tn9zu	cmwd8cfnr0004tsxk7ea7fsoi	CPU	39.5	%	\N	2026-11-12 02:56:17.602	2026-11-12 07:32:02.304
cmwd8cfpf0018tsxkni2gw3qk	cmwd8cfnr0004tsxk7ea7fsoi	CPU	42.8	%	\N	2026-11-12 03:26:55.9	2026-11-12 07:32:02.304
cmwd8cfpf0019tsxk1hq1fusu	cmwd8cfnr0004tsxk7ea7fsoi	CPU	41.8	%	\N	2026-11-12 03:57:34.197	2026-11-12 07:32:02.304
cmwd8cfpf001atsxkyrfmbpeo	cmwd8cfnr0004tsxk7ea7fsoi	CPU	44.6	%	\N	2026-11-12 04:28:12.495	2026-11-12 07:32:02.304
cmwd8cfpf001btsxk26sq8df3	cmwd8cfnr0004tsxk7ea7fsoi	CPU	42.7	%	\N	2026-11-12 04:58:50.793	2026-11-12 07:32:02.304
cmwd8cfpf001ctsxkhua7za5b	cmwd8cfnr0004tsxk7ea7fsoi	CPU	44.5	%	\N	2026-11-12 05:29:29.091	2026-11-12 07:32:02.304
cmwd8cfpf001dtsxk36r6vfwl	cmwd8cfnr0004tsxk7ea7fsoi	CPU	45.8	%	\N	2026-11-12 06:00:07.389	2026-11-12 07:32:02.304
cmwd8cfpf001etsxkbodzjv5d	cmwd8cfnr0004tsxk7ea7fsoi	CPU	42.4	%	\N	2026-11-12 06:30:45.687	2026-11-12 07:32:02.304
cmwd8cfpf001ftsxkf1txko3t	cmwd8cfnr0004tsxk7ea7fsoi	CPU	42.9	%	\N	2026-11-12 07:01:23.985	2026-11-12 07:32:02.304
cmwd8cfpf001gtsxk6hwsvfz0	cmwd8cfnr0004tsxk7ea7fsoi	CPU	39	%	\N	2026-11-12 07:32:02.283	2026-11-12 07:32:02.304
cmwd8cfpf001htsxkbpf7vo42	cmwd8cfnr0004tsxk7ea7fsoi	MEM	52.2	%	\N	2026-11-11 07:32:02.286	2026-11-12 07:32:02.304
cmwd8cfpf001itsxka7iwk5sk	cmwd8cfnr0004tsxk7ea7fsoi	MEM	55.2	%	\N	2026-11-11 08:02:40.583	2026-11-12 07:32:02.304
cmwd8cfpf001jtsxkxhuu3su5	cmwd8cfnr0004tsxk7ea7fsoi	MEM	58.1	%	\N	2026-11-11 08:33:18.881	2026-11-12 07:32:02.304
cmwd8cfpf001ktsxk82tlsgv0	cmwd8cfnr0004tsxk7ea7fsoi	MEM	56.5	%	\N	2026-11-11 09:03:57.179	2026-11-12 07:32:02.304
cmwd8cfpf001ltsxkzhbjzv08	cmwd8cfnr0004tsxk7ea7fsoi	MEM	58.8	%	\N	2026-11-11 09:34:35.477	2026-11-12 07:32:02.304
cmwd8cfpf001mtsxkwifh54zy	cmwd8cfnr0004tsxk7ea7fsoi	MEM	56.5	%	\N	2026-11-11 10:05:13.775	2026-11-12 07:32:02.304
cmwd8cfpf001ntsxkskwoill0	cmwd8cfnr0004tsxk7ea7fsoi	MEM	58	%	\N	2026-11-11 10:35:52.073	2026-11-12 07:32:02.304
cmwd8cfpf001otsxkem413kzn	cmwd8cfnr0004tsxk7ea7fsoi	MEM	54.9	%	\N	2026-11-11 11:06:30.371	2026-11-12 07:32:02.304
cmwd8cfpf001ptsxke20lnlmi	cmwd8cfnr0004tsxk7ea7fsoi	MEM	55.8	%	\N	2026-11-11 11:37:08.668	2026-11-12 07:32:02.304
cmwd8cfpf001qtsxkk5ppt1e5	cmwd8cfnr0004tsxk7ea7fsoi	MEM	56.5	%	\N	2026-11-11 12:07:46.966	2026-11-12 07:32:02.304
cmwd8cfpf001rtsxkto8qp503	cmwd8cfnr0004tsxk7ea7fsoi	MEM	52.9	%	\N	2026-11-11 12:38:25.264	2026-11-12 07:32:02.304
cmwd8cfpf001stsxkm2dfg7au	cmwd8cfnr0004tsxk7ea7fsoi	MEM	53.6	%	\N	2026-11-11 13:09:03.562	2026-11-12 07:32:02.304
cmwd8cfpf001ttsxkr8lukxmj	cmwd8cfnr0004tsxk7ea7fsoi	MEM	50.3	%	\N	2026-11-11 13:39:41.86	2026-11-12 07:32:02.304
cmwd8cfpf001utsxkbvovvutg	cmwd8cfnr0004tsxk7ea7fsoi	MEM	51.5	%	\N	2026-11-11 14:10:20.158	2026-11-12 07:32:02.304
cmwd8cfpg001vtsxkv3wpmnce	cmwd8cfnr0004tsxk7ea7fsoi	MEM	48.9	%	\N	2026-11-11 14:40:58.456	2026-11-12 07:32:02.304
cmwd8cfpg001wtsxkh0swpy04	cmwd8cfnr0004tsxk7ea7fsoi	MEM	50.9	%	\N	2026-11-11 15:11:36.754	2026-11-12 07:32:02.304
cmwd8cfpg001xtsxk841cp5x2	cmwd8cfnr0004tsxk7ea7fsoi	MEM	53.2	%	\N	2026-11-11 15:42:15.051	2026-11-12 07:32:02.304
cmwd8cfpg001ytsxkv0ev0znu	cmwd8cfnr0004tsxk7ea7fsoi	MEM	51.7	%	\N	2026-11-11 16:12:53.349	2026-11-12 07:32:02.304
cmwd8cfpg001ztsxk01klnfcy	cmwd8cfnr0004tsxk7ea7fsoi	MEM	54.6	%	\N	2026-11-11 16:43:31.647	2026-11-12 07:32:02.304
cmwd8cfpg0020tsxkrc5cmfm0	cmwd8cfnr0004tsxk7ea7fsoi	MEM	53.4	%	\N	2026-11-11 17:14:09.945	2026-11-12 07:32:02.304
cmwd8cfpg0021tsxk2gz49hzz	cmwd8cfnr0004tsxk7ea7fsoi	MEM	56.4	%	\N	2026-11-11 17:44:48.243	2026-11-12 07:32:02.304
cmwd8cfpg0022tsxketfga4on	cmwd8cfnr0004tsxk7ea7fsoi	MEM	55	%	\N	2026-11-11 18:15:26.541	2026-11-12 07:32:02.304
cmwd8cfpg0023tsxkg0j5c6wq	cmwd8cfnr0004tsxk7ea7fsoi	MEM	57.6	%	\N	2026-11-11 18:46:04.839	2026-11-12 07:32:02.304
cmwd8cfpg0024tsxk5547mthj	cmwd8cfnr0004tsxk7ea7fsoi	MEM	59.8	%	\N	2026-11-11 19:16:43.137	2026-11-12 07:32:02.304
cmwd8cfpg0025tsxkxy0scy1l	cmwd8cfnr0004tsxk7ea7fsoi	MEM	57.5	%	\N	2026-11-11 19:47:21.434	2026-11-12 07:32:02.304
cmwd8cfpg0026tsxk7xsd0k4q	cmwd8cfnr0004tsxk7ea7fsoi	MEM	58.9	%	\N	2026-11-11 20:17:59.732	2026-11-12 07:32:02.304
cmwd8cfpg0027tsxk6gim9bci	cmwd8cfnr0004tsxk7ea7fsoi	MEM	55.8	%	\N	2026-11-11 20:48:38.03	2026-11-12 07:32:02.304
cmwd8cfpg0028tsxkiv4fgpgh	cmwd8cfnr0004tsxk7ea7fsoi	MEM	56.6	%	\N	2026-11-11 21:19:16.328	2026-11-12 07:32:02.304
cmwd8cfpg0029tsxk5tz0rhjf	cmwd8cfnr0004tsxk7ea7fsoi	MEM	53.1	%	\N	2026-11-11 21:49:54.626	2026-11-12 07:32:02.304
cmwd8cfpg002atsxk7kfst84r	cmwd8cfnr0004tsxk7ea7fsoi	MEM	53.7	%	\N	2026-11-11 22:20:32.924	2026-11-12 07:32:02.304
cmwd8cfpg002btsxkzujlhws0	cmwd8cfnr0004tsxk7ea7fsoi	MEM	54.5	%	\N	2026-11-11 22:51:11.222	2026-11-12 07:32:02.304
cmwd8cfpg002ctsxkp2dtr7tw	cmwd8cfnr0004tsxk7ea7fsoi	MEM	51.2	%	\N	2026-11-11 23:21:49.52	2026-11-12 07:32:02.304
cmwd8cfpg002dtsxkmwnapeky	cmwd8cfnr0004tsxk7ea7fsoi	MEM	52.5	%	\N	2026-11-11 23:52:27.817	2026-11-12 07:32:02.304
cmwd8cfpg002etsxkwv61nn0r	cmwd8cfnr0004tsxk7ea7fsoi	MEM	49.9	%	\N	2026-11-12 00:23:06.115	2026-11-12 07:32:02.304
cmwd8cfpg002ftsxkegdszdhf	cmwd8cfnr0004tsxk7ea7fsoi	MEM	51.9	%	\N	2026-11-12 00:53:44.413	2026-11-12 07:32:02.304
cmwd8cfpg002gtsxkikwsgkrj	cmwd8cfnr0004tsxk7ea7fsoi	MEM	50.1	%	\N	2026-11-12 01:24:22.711	2026-11-12 07:32:02.304
cmwd8cfpg002htsxkj2cddatx	cmwd8cfnr0004tsxk7ea7fsoi	MEM	52.8	%	\N	2026-11-12 01:55:01.009	2026-11-12 07:32:02.304
cmwd8cfpg002itsxkdtwjuyui	cmwd8cfnr0004tsxk7ea7fsoi	MEM	55.7	%	\N	2026-11-12 02:25:39.307	2026-11-12 07:32:02.304
cmwd8cfpg002jtsxksnql636h	cmwd8cfnr0004tsxk7ea7fsoi	MEM	54.6	%	\N	2026-11-12 02:56:17.605	2026-11-12 07:32:02.304
cmwd8cfpg002ktsxk84et61ig	cmwd8cfnr0004tsxk7ea7fsoi	MEM	57.5	%	\N	2026-11-12 03:26:55.903	2026-11-12 07:32:02.304
cmwd8cfpg002ltsxkdiobtgfd	cmwd8cfnr0004tsxk7ea7fsoi	MEM	56.1	%	\N	2026-11-12 03:57:34.2	2026-11-12 07:32:02.304
cmwd8cfpg002mtsxksm9rl79v	cmwd8cfnr0004tsxk7ea7fsoi	MEM	58.7	%	\N	2026-11-12 04:28:12.498	2026-11-12 07:32:02.304
cmwd8cfpg002ntsxk0emhid16	cmwd8cfnr0004tsxk7ea7fsoi	MEM	56.6	%	\N	2026-11-12 04:58:50.796	2026-11-12 07:32:02.304
cmwd8cfpg002otsxkj166otx0	cmwd8cfnr0004tsxk7ea7fsoi	MEM	58.4	%	\N	2026-11-12 05:29:29.094	2026-11-12 07:32:02.304
cmwd8cfpg002ptsxkgjhozyy3	cmwd8cfnr0004tsxk7ea7fsoi	MEM	59.8	%	\N	2026-11-12 06:00:07.392	2026-11-12 07:32:02.304
cmwd8cfpg002qtsxkvmye7m4u	cmwd8cfnr0004tsxk7ea7fsoi	MEM	56.7	%	\N	2026-11-12 06:30:45.69	2026-11-12 07:32:02.304
cmwd8cfpg002rtsxkuazphy7a	cmwd8cfnr0004tsxk7ea7fsoi	MEM	57.5	%	\N	2026-11-12 07:01:23.988	2026-11-12 07:32:02.304
cmwd8cfpg002stsxk0jqjd2lr	cmwd8cfnr0004tsxk7ea7fsoi	MEM	53.9	%	\N	2026-11-12 07:32:02.286	2026-11-12 07:32:02.304
cmwd8cfpg002ttsxkv117qvy8	cmwd8cfnr0004tsxk7ea7fsoi	DISK	59.2	%	\N	2026-11-11 07:32:02.286	2026-11-12 07:32:02.304
cmwd8cfpg002utsxkci0wre3a	cmwd8cfnr0004tsxk7ea7fsoi	DISK	61.6	%	\N	2026-11-11 08:02:40.583	2026-11-12 07:32:02.304
cmwd8cfpg002vtsxk0v4ec2ji	cmwd8cfnr0004tsxk7ea7fsoi	DISK	64	%	\N	2026-11-11 08:33:18.881	2026-11-12 07:32:02.304
cmwd8cfpg002wtsxk0djn4gqj	cmwd8cfnr0004tsxk7ea7fsoi	DISK	62	%	\N	2026-11-11 09:03:57.179	2026-11-12 07:32:02.304
cmwd8cfph002xtsxkhyw7lco9	cmwd8cfnr0004tsxk7ea7fsoi	DISK	64	%	\N	2026-11-11 09:34:35.477	2026-11-12 07:32:02.304
cmwd8cfph002ytsxkkvrss3k1	cmwd8cfnr0004tsxk7ea7fsoi	DISK	61.7	%	\N	2026-11-11 10:05:13.775	2026-11-12 07:32:02.304
cmwd8cfph002ztsxkdrl2ulls	cmwd8cfnr0004tsxk7ea7fsoi	DISK	63.4	%	\N	2026-11-11 10:35:52.073	2026-11-12 07:32:02.304
cmwd8cfph0030tsxksrp4vm06	cmwd8cfnr0004tsxk7ea7fsoi	DISK	60.6	%	\N	2026-11-11 11:06:30.371	2026-11-12 07:32:02.304
cmwd8cfph0031tsxkp1sdf1ey	cmwd8cfnr0004tsxk7ea7fsoi	DISK	62	%	\N	2026-11-11 11:37:08.668	2026-11-12 07:32:02.304
cmwd8cfph0032tsxkg6i844kl	cmwd8cfnr0004tsxk7ea7fsoi	DISK	63.2	%	\N	2026-11-11 12:07:46.966	2026-11-12 07:32:02.304
cmwd8cfph0033tsxki0nd1f3y	cmwd8cfnr0004tsxk7ea7fsoi	DISK	60.3	%	\N	2026-11-11 12:38:25.264	2026-11-12 07:32:02.304
cmwd8cfph0034tsxkgoi602s8	cmwd8cfnr0004tsxk7ea7fsoi	DISK	61.5	%	\N	2026-11-11 13:09:03.562	2026-11-12 07:32:02.304
cmwd8cfph0035tsxkdco0rq8t	cmwd8cfnr0004tsxk7ea7fsoi	DISK	58.7	%	\N	2026-11-11 13:39:41.86	2026-11-12 07:32:02.304
cmwd8cfph0036tsxkkykpu7yl	cmwd8cfnr0004tsxk7ea7fsoi	DISK	60.2	%	\N	2026-11-11 14:10:20.158	2026-11-12 07:32:02.304
cmwd8cfph0037tsxkfmwcet70	cmwd8cfnr0004tsxk7ea7fsoi	DISK	57.7	%	\N	2026-11-11 14:40:58.456	2026-11-12 07:32:02.304
cmwd8cfph0038tsxkxqtrv8zb	cmwd8cfnr0004tsxk7ea7fsoi	DISK	59.6	%	\N	2026-11-11 15:11:36.754	2026-11-12 07:32:02.304
cmwd8cfph0039tsxk64b2tmfu	cmwd8cfnr0004tsxk7ea7fsoi	DISK	61.7	%	\N	2026-11-11 15:42:15.051	2026-11-12 07:32:02.304
cmwd8cfph003atsxkn6sgqaiy	cmwd8cfnr0004tsxk7ea7fsoi	DISK	59.7	%	\N	2026-11-11 16:12:53.349	2026-11-12 07:32:02.304
cmwd8cfph003btsxkvoi3rk9d	cmwd8cfnr0004tsxk7ea7fsoi	DISK	62.1	%	\N	2026-11-11 16:43:31.647	2026-11-12 07:32:02.304
cmwd8cfph003ctsxk5kquo83p	cmwd8cfnr0004tsxk7ea7fsoi	DISK	60.3	%	\N	2026-11-11 17:14:09.945	2026-11-12 07:32:02.304
cmwd8cfph003dtsxkm1rmapfl	cmwd8cfnr0004tsxk7ea7fsoi	DISK	62.7	%	\N	2026-11-11 17:44:48.243	2026-11-12 07:32:02.304
cmwd8cfph003etsxk4fhzcvb3	cmwd8cfnr0004tsxk7ea7fsoi	DISK	60.8	%	\N	2026-11-11 18:15:26.541	2026-11-12 07:32:02.304
cmwd8cfph003ftsxkfe8qiwzh	cmwd8cfnr0004tsxk7ea7fsoi	DISK	63	%	\N	2026-11-11 18:46:04.839	2026-11-12 07:32:02.304
cmwd8cfph003gtsxkne8rxhiw	cmwd8cfnr0004tsxk7ea7fsoi	DISK	65	%	\N	2026-11-11 19:16:43.137	2026-11-12 07:32:02.304
cmwd8cfph003htsxkpy6ncasl	cmwd8cfnr0004tsxk7ea7fsoi	DISK	62.7	%	\N	2026-11-11 19:47:21.434	2026-11-12 07:32:02.304
cmwd8cfph003itsxkjnt5d3xt	cmwd8cfnr0004tsxk7ea7fsoi	DISK	64.3	%	\N	2026-11-11 20:17:59.732	2026-11-12 07:32:02.304
cmwd8cfph003jtsxktbyaiigj	cmwd8cfnr0004tsxk7ea7fsoi	DISK	61.6	%	\N	2026-11-11 20:48:38.03	2026-11-12 07:32:02.304
cmwd8cfph003ktsxkpzv8kglp	cmwd8cfnr0004tsxk7ea7fsoi	DISK	62.9	%	\N	2026-11-11 21:19:16.328	2026-11-12 07:32:02.304
cmwd8cfph003ltsxky8nvw2u6	cmwd8cfnr0004tsxk7ea7fsoi	DISK	59.9	%	\N	2026-11-11 21:49:54.626	2026-11-12 07:32:02.304
cmwd8cfph003mtsxkxwwjh20s	cmwd8cfnr0004tsxk7ea7fsoi	DISK	61.2	%	\N	2026-11-11 22:20:32.924	2026-11-12 07:32:02.304
cmwd8cfph003ntsxkjjc4k6a5	cmwd8cfnr0004tsxk7ea7fsoi	DISK	62.4	%	\N	2026-11-11 22:51:11.222	2026-11-12 07:32:02.304
cmwd8cfph003otsxkmoz05j05	cmwd8cfnr0004tsxk7ea7fsoi	DISK	59.6	%	\N	2026-11-11 23:21:49.52	2026-11-12 07:32:02.304
cmwd8cfph003ptsxk7r6psuid	cmwd8cfnr0004tsxk7ea7fsoi	DISK	61.2	%	\N	2026-11-11 23:52:27.817	2026-11-12 07:32:02.304
cmwd8cfph003qtsxkv33yxuud	cmwd8cfnr0004tsxk7ea7fsoi	DISK	58.7	%	\N	2026-11-12 00:23:06.115	2026-11-12 07:32:02.304
cmwd8cfph003rtsxk5uz4cvnh	cmwd8cfnr0004tsxk7ea7fsoi	DISK	60.6	%	\N	2026-11-12 00:53:44.413	2026-11-12 07:32:02.304
cmwd8cfph003stsxkdzo32aq1	cmwd8cfnr0004tsxk7ea7fsoi	DISK	58.5	%	\N	2026-11-12 01:24:22.711	2026-11-12 07:32:02.304
cmwd8cfph003ttsxkct4li7jv	cmwd8cfnr0004tsxk7ea7fsoi	DISK	60.8	%	\N	2026-11-12 01:55:01.009	2026-11-12 07:32:02.304
cmwd8cfph003utsxkqqe8neg6	cmwd8cfnr0004tsxk7ea7fsoi	DISK	63.2	%	\N	2026-11-12 02:25:39.307	2026-11-12 07:32:02.304
cmwd8cfph003vtsxkiquhxoza	cmwd8cfnr0004tsxk7ea7fsoi	DISK	61.4	%	\N	2026-11-12 02:56:17.605	2026-11-12 07:32:02.304
cmwd8cfph003wtsxkznp5titd	cmwd8cfnr0004tsxk7ea7fsoi	DISK	63.8	%	\N	2026-11-12 03:26:55.903	2026-11-12 07:32:02.304
cmwd8cfpi003xtsxkpfndggv6	cmwd8cfnr0004tsxk7ea7fsoi	DISK	61.9	%	\N	2026-11-12 03:57:34.2	2026-11-12 07:32:02.304
cmwd8cfpi003ytsxkbdcr11od	cmwd8cfnr0004tsxk7ea7fsoi	DISK	64.1	%	\N	2026-11-12 04:28:12.498	2026-11-12 07:32:02.304
cmwd8cfpi003ztsxks3ykcc79	cmwd8cfnr0004tsxk7ea7fsoi	DISK	61.9	%	\N	2026-11-12 04:58:50.796	2026-11-12 07:32:02.304
cmwd8cfpi0040tsxk5dc20huk	cmwd8cfnr0004tsxk7ea7fsoi	DISK	63.7	%	\N	2026-11-12 05:29:29.094	2026-11-12 07:32:02.304
cmwd8cfpi0041tsxkxgp7q5q9	cmwd8cfnr0004tsxk7ea7fsoi	DISK	65.3	%	\N	2026-11-12 06:00:07.392	2026-11-12 07:32:02.304
cmwd8cfpi0042tsxk14v04vo4	cmwd8cfnr0004tsxk7ea7fsoi	DISK	62.5	%	\N	2026-11-12 06:30:45.69	2026-11-12 07:32:02.304
cmwd8cfpi0043tsxkxx8m48a3	cmwd8cfnr0004tsxk7ea7fsoi	DISK	63.8	%	\N	2026-11-12 07:01:23.988	2026-11-12 07:32:02.304
cmwd8cfpi0044tsxkot6jrm3h	cmwd8cfnr0004tsxk7ea7fsoi	DISK	60.9	%	\N	2026-11-12 07:32:02.286	2026-11-12 07:32:02.304
cmwd8cfpi0045tsxk5q7267xr	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	25.8	MB/s	\N	2026-11-11 07:32:02.286	2026-11-12 07:32:02.304
cmwd8cfpi0046tsxk7o0phmw7	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	29.6	MB/s	\N	2026-11-11 08:02:40.583	2026-11-12 07:32:02.304
cmwd8cfpi0047tsxkys1hj9bh	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	33.1	MB/s	\N	2026-11-11 08:33:18.881	2026-11-12 07:32:02.304
cmwd8cfpi0048tsxk4dt7ozgu	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	32	MB/s	\N	2026-11-11 09:03:57.179	2026-11-12 07:32:02.304
cmwd8cfpi0049tsxktuuvwm24	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	34.6	MB/s	\N	2026-11-11 09:34:35.477	2026-11-12 07:32:02.304
cmwd8cfpi004atsxkxecxq583	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	32.4	MB/s	\N	2026-11-11 10:05:13.775	2026-11-12 07:32:02.304
cmwd8cfpi004btsxksm5jm69f	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	33.7	MB/s	\N	2026-11-11 10:35:52.073	2026-11-12 07:32:02.304
cmwd8cfpi004ctsxkfp7tlrz7	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	30.1	MB/s	\N	2026-11-11 11:06:30.371	2026-11-12 07:32:02.304
cmwd8cfpi004dtsxkin1fo3j5	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	30.3	MB/s	\N	2026-11-11 11:37:08.668	2026-11-12 07:32:02.304
cmwd8cfpi004etsxkd0dlkwlc	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	30.2	MB/s	\N	2026-11-11 12:07:46.966	2026-11-12 07:32:02.304
cmwd8cfpi004ftsxk3fjq9c04	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	25.9	MB/s	\N	2026-11-11 12:38:25.264	2026-11-12 07:32:02.304
cmwd8cfpi004gtsxkfzuth04t	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	25.8	MB/s	\N	2026-11-11 13:09:03.562	2026-11-12 07:32:02.304
cmwd8cfpi004htsxkfe8jx5tq	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	21.9	MB/s	\N	2026-11-11 13:39:41.86	2026-11-12 07:32:02.304
cmwd8cfpi004itsxkt8k67p35	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	22.6	MB/s	\N	2026-11-11 14:10:20.158	2026-11-12 07:32:02.304
cmwd8cfpi004jtsxkggs36wfo	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	19.8	MB/s	\N	2026-11-11 14:40:58.456	2026-11-12 07:32:02.304
cmwd8cfpi004ktsxkqmn3hcqs	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	21.8	MB/s	\N	2026-11-11 15:11:36.754	2026-11-12 07:32:02.304
cmwd8cfpi004ltsxkam3z7jr7	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	24.5	MB/s	\N	2026-11-11 15:42:15.051	2026-11-12 07:32:02.304
cmwd8cfpi004mtsxks47ql8me	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	23.5	MB/s	\N	2026-11-11 16:12:53.349	2026-11-12 07:32:02.304
cmwd8cfpi004ntsxk3dzo29b7	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	27.1	MB/s	\N	2026-11-11 16:43:31.647	2026-11-12 07:32:02.304
cmwd8cfpi004otsxkfw2mjaas	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	26.7	MB/s	\N	2026-11-11 17:14:09.945	2026-11-12 07:32:02.304
cmwd8cfpi004ptsxkui9l0s0d	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	30.4	MB/s	\N	2026-11-11 17:44:48.243	2026-11-12 07:32:02.304
cmwd8cfpi004qtsxkr0srvgii	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	29.7	MB/s	\N	2026-11-11 18:15:26.541	2026-11-12 07:32:02.304
cmwd8cfpi004rtsxk3fs6jeut	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	32.8	MB/s	\N	2026-11-11 18:46:04.839	2026-11-12 07:32:02.304
cmwd8cfpi004stsxkpiq2nqlc	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	35.3	MB/s	\N	2026-11-11 19:16:43.137	2026-11-12 07:32:02.304
cmwd8cfpi004ttsxkfff5wd08	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	32.9	MB/s	\N	2026-11-11 19:47:21.434	2026-11-12 07:32:02.304
cmwd8cfpi004utsxko6v3ef9l	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	34.1	MB/s	\N	2026-11-11 20:17:59.732	2026-11-12 07:32:02.304
cmwd8cfpi004vtsxk83qrtvz6	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	30.5	MB/s	\N	2026-11-11 20:48:38.03	2026-11-12 07:32:02.304
cmwd8cfpi004wtsxk39cb1izj	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	30.7	MB/s	\N	2026-11-11 21:19:16.328	2026-11-12 07:32:02.304
cmwd8cfpi004xtsxkx3jznlza	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	26.3	MB/s	\N	2026-11-11 21:49:54.626	2026-11-12 07:32:02.304
cmwd8cfpi004ytsxkyvzo08el	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	26.2	MB/s	\N	2026-11-11 22:20:32.924	2026-11-12 07:32:02.304
cmwd8cfpj004ztsxkw3ccsn4x	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	26.1	MB/s	\N	2026-11-11 22:51:11.222	2026-11-12 07:32:02.304
cmwd8cfpj0050tsxkb6o31hsn	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	22.3	MB/s	\N	2026-11-11 23:21:49.52	2026-11-12 07:32:02.304
cmwd8cfpj0051tsxkwcgfp1gq	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	23.1	MB/s	\N	2026-11-11 23:52:27.817	2026-11-12 07:32:02.304
cmwd8cfpj0052tsxka562qfoo	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	20.4	MB/s	\N	2026-11-12 00:23:06.115	2026-11-12 07:32:02.304
cmwd8cfpj0053tsxk5gys7n81	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	22.5	MB/s	\N	2026-11-12 00:53:44.413	2026-11-12 07:32:02.304
cmwd8cfpj0054tsxkiwfe81nw	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	21.1	MB/s	\N	2026-11-12 01:24:22.711	2026-11-12 07:32:02.304
cmwd8cfpj0055tsxkbh4x9y8k	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	24.4	MB/s	\N	2026-11-12 01:55:01.009	2026-11-12 07:32:02.304
cmwd8cfpj0056tsxkq1ihbodz	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	28	MB/s	\N	2026-11-12 02:25:39.307	2026-11-12 07:32:02.304
cmwd8cfpj0057tsxk37wno2kz	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	27.6	MB/s	\N	2026-11-12 02:56:17.605	2026-11-12 07:32:02.304
cmwd8cfpj0058tsxk6afit2zv	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	31.3	MB/s	\N	2026-11-12 03:26:55.903	2026-11-12 07:32:02.304
cmwd8cfpj0059tsxkjn81ox6e	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	30.6	MB/s	\N	2026-11-12 03:57:34.2	2026-11-12 07:32:02.304
cmwd8cfpj005atsxk5fq87u0h	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	33.5	MB/s	\N	2026-11-12 04:28:12.498	2026-11-12 07:32:02.304
cmwd8cfpj005btsxk37l87fc9	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	31.7	MB/s	\N	2026-11-12 04:58:50.796	2026-11-12 07:32:02.304
cmwd8cfpj005ctsxkuba9so3o	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	33.5	MB/s	\N	2026-11-12 05:29:29.094	2026-11-12 07:32:02.304
cmwd8cfpj005dtsxkqmxt3kg0	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	34.6	MB/s	\N	2026-11-12 06:00:07.392	2026-11-12 07:32:02.304
cmwd8cfpj005etsxko274hrov	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	30.9	MB/s	\N	2026-11-12 06:30:45.69	2026-11-12 07:32:02.304
cmwd8cfpj005ftsxkx3s6w8xl	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	31	MB/s	\N	2026-11-12 07:01:23.988	2026-11-12 07:32:02.304
cmwd8cfpj005gtsxkl34fyb5x	cmwd8cfnr0004tsxk7ea7fsoi	NET_IN	26.6	MB/s	\N	2026-11-12 07:32:02.286	2026-11-12 07:32:02.304
cmwd8cfpj005htsxk8a481uzj	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	19.5	MB/s	\N	2026-11-11 07:32:02.286	2026-11-12 07:32:02.304
cmwd8cfpj005itsxk0867vds5	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	22.9	MB/s	\N	2026-11-11 08:02:40.583	2026-11-12 07:32:02.304
cmwd8cfpj005jtsxk9coflhbt	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	26.1	MB/s	\N	2026-11-11 08:33:18.881	2026-11-12 07:32:02.304
cmwd8cfpj005ktsxkps39snz9	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	24.8	MB/s	\N	2026-11-11 09:03:57.179	2026-11-12 07:32:02.304
cmwd8cfpj005ltsxkx1hhft44	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	27.2	MB/s	\N	2026-11-11 09:34:35.477	2026-11-12 07:32:02.304
cmwd8cfpj005mtsxkigsy6tmd	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	24.9	MB/s	\N	2026-11-11 10:05:13.775	2026-11-12 07:32:02.304
cmwd8cfpj005ntsxk1oinkgzk	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	26.3	MB/s	\N	2026-11-11 10:35:52.073	2026-11-12 07:32:02.304
cmwd8cfpj005otsxk1pgwkdhv	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	23	MB/s	\N	2026-11-11 11:06:30.371	2026-11-12 07:32:02.304
cmwd8cfpj005ptsxkr2wikwva	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	23.5	MB/s	\N	2026-11-11 11:37:08.668	2026-11-12 07:32:02.304
cmwd8cfpj005qtsxkp6dtmzye	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	23.8	MB/s	\N	2026-11-11 12:07:46.966	2026-11-12 07:32:02.304
cmwd8cfpj005rtsxknhserhab	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	19.8	MB/s	\N	2026-11-11 12:38:25.264	2026-11-12 07:32:02.304
cmwd8cfpj005stsxks1rj9qu3	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	20.1	MB/s	\N	2026-11-11 13:09:03.562	2026-11-12 07:32:02.304
cmwd8cfpj005ttsxkgul1v3ly	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	16.5	MB/s	\N	2026-11-11 13:39:41.86	2026-11-12 07:32:02.304
cmwd8cfpj005utsxkrlkd1a5w	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	17.5	MB/s	\N	2026-11-11 14:10:20.158	2026-11-12 07:32:02.304
cmwd8cfpj005vtsxk2c29uu59	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	14.7	MB/s	\N	2026-11-11 14:40:58.456	2026-11-12 07:32:02.304
cmwd8cfpj005wtsxk6s6rvrn4	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	16.7	MB/s	\N	2026-11-11 15:11:36.754	2026-11-12 07:32:02.304
cmwd8cfpj005xtsxki5xodojn	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	19.2	MB/s	\N	2026-11-11 15:42:15.051	2026-11-12 07:32:02.304
cmwd8cfpj005ytsxkb28ihx2h	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	18	MB/s	\N	2026-11-11 16:12:53.349	2026-11-12 07:32:02.304
cmwd8cfpj005ztsxkd1wyiagw	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	21.2	MB/s	\N	2026-11-11 16:43:31.647	2026-11-12 07:32:02.304
cmwd8cfpj0060tsxk19ozme2s	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	20.4	MB/s	\N	2026-11-11 17:14:09.945	2026-11-12 07:32:02.304
cmwd8cfpj0061tsxkpalolx62	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	23.7	MB/s	\N	2026-11-11 17:44:48.243	2026-11-12 07:32:02.304
cmwd8cfpj0062tsxkpa7o3684	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	22.7	MB/s	\N	2026-11-11 18:15:26.541	2026-11-12 07:32:02.304
cmwd8cfpk0063tsxkptz6xlnl	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	25.5	MB/s	\N	2026-11-11 18:46:04.839	2026-11-12 07:32:02.304
cmwd8cfpk0064tsxkzfy3r6mj	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	27.8	MB/s	\N	2026-11-11 19:16:43.137	2026-11-12 07:32:02.304
cmwd8cfpk0065tsxkd1bittk7	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	25.5	MB/s	\N	2026-11-11 19:47:21.434	2026-11-12 07:32:02.304
cmwd8cfpk0066tsxk2wg498ry	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	26.8	MB/s	\N	2026-11-11 20:17:59.732	2026-11-12 07:32:02.304
cmwd8cfpk0067tsxkkg8xwl8d	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	23.4	MB/s	\N	2026-11-11 20:48:38.03	2026-11-12 07:32:02.304
cmwd8cfpk0068tsxk8amaznhm	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	23.9	MB/s	\N	2026-11-11 21:19:16.328	2026-11-12 07:32:02.304
cmwd8cfpk0069tsxkgirx927d	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	20	MB/s	\N	2026-11-11 21:49:54.626	2026-11-12 07:32:02.304
cmwd8cfpk006atsxkx8t3x0dr	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	20.2	MB/s	\N	2026-11-11 22:20:32.924	2026-11-12 07:32:02.304
cmwd8cfpk006btsxkzkcwc3yx	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	20.5	MB/s	\N	2026-11-11 22:51:11.222	2026-11-12 07:32:02.304
cmwd8cfpk006ctsxkxtizouo2	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	16.9	MB/s	\N	2026-11-11 23:21:49.52	2026-11-12 07:32:02.304
cmwd8cfpk006dtsxkvljxcyub	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	18	MB/s	\N	2026-11-11 23:52:27.817	2026-11-12 07:32:02.304
cmwd8cfpk006etsxkfus9a3zn	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	15.3	MB/s	\N	2026-11-12 00:23:06.115	2026-11-12 07:32:02.304
cmwd8cfpk006ftsxk6exrr8v6	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	17.4	MB/s	\N	2026-11-12 00:53:44.413	2026-11-12 07:32:02.304
cmwd8cfpk006gtsxk9r2pz57n	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	15.8	MB/s	\N	2026-11-12 01:24:22.711	2026-11-12 07:32:02.304
cmwd8cfpk006htsxkvclo3d6k	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	18.8	MB/s	\N	2026-11-12 01:55:01.009	2026-11-12 07:32:02.304
cmwd8cfpk006itsxkju8987ma	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	22	MB/s	\N	2026-11-12 02:25:39.307	2026-11-12 07:32:02.304
cmwd8cfpk006jtsxk1j8bc1f3	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	21.2	MB/s	\N	2026-11-12 02:56:17.605	2026-11-12 07:32:02.304
cmwd8cfpk006ktsxko1lujs9x	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	24.6	MB/s	\N	2026-11-12 03:26:55.903	2026-11-12 07:32:02.304
cmwd8cfpk006ltsxkgcqsi0zi	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	23.5	MB/s	\N	2026-11-12 03:57:34.2	2026-11-12 07:32:02.304
cmwd8cfpk006mtsxkxbpmdyyd	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	26.2	MB/s	\N	2026-11-12 04:28:12.498	2026-11-12 07:32:02.304
cmwd8cfpk006ntsxk8q7t7ft1	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	24.3	MB/s	\N	2026-11-12 04:58:50.796	2026-11-12 07:32:02.304
cmwd8cfpk006otsxki8r2dbv4	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	26	MB/s	\N	2026-11-12 05:29:29.094	2026-11-12 07:32:02.304
cmwd8cfpk006ptsxke9xibl3h	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	27.3	MB/s	\N	2026-11-12 06:00:07.392	2026-11-12 07:32:02.304
cmwd8cfpk006qtsxk5j6e3bxy	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	23.9	MB/s	\N	2026-11-12 06:30:45.69	2026-11-12 07:32:02.304
cmwd8cfpk006rtsxk26wthq1c	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	24.3	MB/s	\N	2026-11-12 07:01:23.988	2026-11-12 07:32:02.304
cmwd8cfpk006stsxkmgsf85ov	cmwd8cfnr0004tsxk7ea7fsoi	NET_OUT	20.3	MB/s	\N	2026-11-12 07:32:02.286	2026-11-12 07:32:02.304
cmwd8cfvw006utsxkv0gmexl6	cmwd8cfv7006ttsxkqnhqaq7s	CPU	70.2	%	\N	2026-11-11 07:32:02.522	2026-11-12 07:32:02.539
cmwd8cfvw006vtsxkycgetfmq	cmwd8cfv7006ttsxkqnhqaq7s	CPU	73.6	%	\N	2026-11-11 08:02:40.819	2026-11-12 07:32:02.539
cmwd8cfvw006wtsxkcx26z406	cmwd8cfv7006ttsxkqnhqaq7s	CPU	76.9	%	\N	2026-11-11 08:33:19.117	2026-11-12 07:32:02.539
cmwd8cfvw006xtsxk5b0f9i5j	cmwd8cfv7006ttsxkqnhqaq7s	CPU	75.6	%	\N	2026-11-11 09:03:57.415	2026-11-12 07:32:02.539
cmwd8cfvw006ytsxkitl9h7i0	cmwd8cfv7006ttsxkqnhqaq7s	CPU	78	%	\N	2026-11-11 09:34:35.713	2026-11-12 07:32:02.539
cmwd8cfvx006ztsxk0doe0pnb	cmwd8cfv7006ttsxkqnhqaq7s	CPU	75.8	%	\N	2026-11-11 10:05:14.011	2026-11-12 07:32:02.539
cmwd8cfvx0070tsxkdaxo5hv9	cmwd8cfv7006ttsxkqnhqaq7s	CPU	77.2	%	\N	2026-11-11 10:35:52.309	2026-11-12 07:32:02.539
cmwd8cfvx0071tsxkwffvhyen	cmwd8cfv7006ttsxkqnhqaq7s	CPU	74	%	\N	2026-11-11 11:06:30.607	2026-11-12 07:32:02.539
cmwd8cfvx0072tsxk9i8om4pr	cmwd8cfv7006ttsxkqnhqaq7s	CPU	74.5	%	\N	2026-11-11 11:37:08.904	2026-11-12 07:32:02.539
cmwd8cfvx0073tsxksnexfurh	cmwd8cfv7006ttsxkqnhqaq7s	CPU	74.9	%	\N	2026-11-11 12:07:47.202	2026-11-12 07:32:02.539
cmwd8cfvx0074tsxke90l6rle	cmwd8cfv7006ttsxkqnhqaq7s	CPU	70.9	%	\N	2026-11-11 12:38:25.5	2026-11-12 07:32:02.539
cmwd8cfvx0075tsxkc4s6fy1i	cmwd8cfv7006ttsxkqnhqaq7s	CPU	71.3	%	\N	2026-11-11 13:09:03.798	2026-11-12 07:32:02.539
cmwd8cfvx0076tsxko53l6t8w	cmwd8cfv7006ttsxkqnhqaq7s	CPU	67.7	%	\N	2026-11-11 13:39:42.096	2026-11-12 07:32:02.539
cmwd8cfvx0077tsxkj3u6g994	cmwd8cfv7006ttsxkqnhqaq7s	CPU	68.7	%	\N	2026-11-11 14:10:20.394	2026-11-12 07:32:02.539
cmwd8cfvx0078tsxkr59qop07	cmwd8cfv7006ttsxkqnhqaq7s	CPU	66	%	\N	2026-11-11 14:40:58.692	2026-11-12 07:32:02.539
cmwd8cfvx0079tsxk4032iw3s	cmwd8cfv7006ttsxkqnhqaq7s	CPU	68	%	\N	2026-11-11 15:11:36.99	2026-11-12 07:32:02.539
cmwd8cfvx007atsxkci3z9bh6	cmwd8cfv7006ttsxkqnhqaq7s	CPU	70.6	%	\N	2026-11-11 15:42:15.287	2026-11-12 07:32:02.539
cmwd8cfvx007btsxk7f2rv7tw	cmwd8cfv7006ttsxkqnhqaq7s	CPU	69.3	%	\N	2026-11-11 16:12:53.585	2026-11-12 07:32:02.539
cmwd8cfvx007ctsxk3ad1obav	cmwd8cfv7006ttsxkqnhqaq7s	CPU	72.6	%	\N	2026-11-11 16:43:31.883	2026-11-12 07:32:02.539
cmwd8cfvx007dtsxkmobhwdrd	cmwd8cfv7006ttsxkqnhqaq7s	CPU	71.8	%	\N	2026-11-11 17:14:10.181	2026-11-12 07:32:02.539
cmwd8cfvx007etsxkd1fcv6is	cmwd8cfv7006ttsxkqnhqaq7s	CPU	75.2	%	\N	2026-11-11 17:44:48.479	2026-11-12 07:32:02.539
cmwd8cfvx007ftsxkqk5s89ox	cmwd8cfv7006ttsxkqnhqaq7s	CPU	74.2	%	\N	2026-11-11 18:15:26.777	2026-11-12 07:32:02.539
cmwd8cfvx007gtsxk5eeu0lsi	cmwd8cfv7006ttsxkqnhqaq7s	CPU	77.1	%	\N	2026-11-11 18:46:05.075	2026-11-12 07:32:02.539
cmwd8cfvx007htsxkvcht3cfp	cmwd8cfv7006ttsxkqnhqaq7s	CPU	79.5	%	\N	2026-11-11 19:16:43.373	2026-11-12 07:32:02.539
cmwd8cfvx007itsxkhb8db73k	cmwd8cfv7006ttsxkqnhqaq7s	CPU	77.1	%	\N	2026-11-11 19:47:21.67	2026-11-12 07:32:02.539
cmwd8cfvx007jtsxkeh48b1cl	cmwd8cfv7006ttsxkqnhqaq7s	CPU	78.5	%	\N	2026-11-11 20:17:59.968	2026-11-12 07:32:02.539
cmwd8cfvx007ktsxk2rdct7mk	cmwd8cfv7006ttsxkqnhqaq7s	CPU	75.2	%	\N	2026-11-11 20:48:38.266	2026-11-12 07:32:02.539
cmwd8cfvx007ltsxkr1g0sypb	cmwd8cfv7006ttsxkqnhqaq7s	CPU	75.7	%	\N	2026-11-11 21:19:16.564	2026-11-12 07:32:02.539
cmwd8cfvx007mtsxkif907dem	cmwd8cfv7006ttsxkqnhqaq7s	CPU	71.8	%	\N	2026-11-11 21:49:54.862	2026-11-12 07:32:02.539
cmwd8cfvx007ntsxk3gbe7k0n	cmwd8cfv7006ttsxkqnhqaq7s	CPU	72.1	%	\N	2026-11-11 22:20:33.16	2026-11-12 07:32:02.539
cmwd8cfvx007otsxk6gk8y66m	cmwd8cfv7006ttsxkqnhqaq7s	CPU	72.4	%	\N	2026-11-11 22:51:11.458	2026-11-12 07:32:02.539
cmwd8cfvx007ptsxkvyrgsy59	cmwd8cfv7006ttsxkqnhqaq7s	CPU	68.9	%	\N	2026-11-11 23:21:49.756	2026-11-12 07:32:02.539
cmwd8cfvx007qtsxkqmpaa2xd	cmwd8cfv7006ttsxkqnhqaq7s	CPU	70	%	\N	2026-11-11 23:52:28.053	2026-11-12 07:32:02.539
cmwd8cfvx007rtsxkleefu4d5	cmwd8cfv7006ttsxkqnhqaq7s	CPU	67.4	%	\N	2026-11-12 00:23:06.351	2026-11-12 07:32:02.539
cmwd8cfvx007stsxkkac6y3sz	cmwd8cfv7006ttsxkqnhqaq7s	CPU	69.5	%	\N	2026-11-12 00:53:44.649	2026-11-12 07:32:02.539
cmwd8cfvx007ttsxkn09bq37w	cmwd8cfv7006ttsxkqnhqaq7s	CPU	67.9	%	\N	2026-11-12 01:24:22.947	2026-11-12 07:32:02.539
cmwd8cfvx007utsxk9g7vm84a	cmwd8cfv7006ttsxkqnhqaq7s	CPU	70.9	%	\N	2026-11-12 01:55:01.245	2026-11-12 07:32:02.539
cmwd8cfvx007vtsxkfh7mro8m	cmwd8cfv7006ttsxkqnhqaq7s	CPU	74.2	%	\N	2026-11-12 02:25:39.543	2026-11-12 07:32:02.539
cmwd8cfvx007wtsxkcbcecfb4	cmwd8cfv7006ttsxkqnhqaq7s	CPU	73.5	%	\N	2026-11-12 02:56:17.841	2026-11-12 07:32:02.539
cmwd8cfvx007xtsxkmttdl6aq	cmwd8cfv7006ttsxkqnhqaq7s	CPU	76.8	%	\N	2026-11-12 03:26:56.139	2026-11-12 07:32:02.539
cmwd8cfvx007ytsxkxwrm6jg9	cmwd8cfv7006ttsxkqnhqaq7s	CPU	75.8	%	\N	2026-11-12 03:57:34.436	2026-11-12 07:32:02.539
cmwd8cfvx007ztsxk9aaesf7m	cmwd8cfv7006ttsxkqnhqaq7s	CPU	78.6	%	\N	2026-11-12 04:28:12.734	2026-11-12 07:32:02.539
cmwd8cfvx0080tsxk0qfqvcvc	cmwd8cfv7006ttsxkqnhqaq7s	CPU	76.7	%	\N	2026-11-12 04:58:51.032	2026-11-12 07:32:02.539
cmwd8cfvx0081tsxkfpog3h96	cmwd8cfv7006ttsxkqnhqaq7s	CPU	78.5	%	\N	2026-11-12 05:29:29.33	2026-11-12 07:32:02.539
cmwd8cfvx0082tsxkkikodv7o	cmwd8cfv7006ttsxkqnhqaq7s	CPU	79.8	%	\N	2026-11-12 06:00:07.628	2026-11-12 07:32:02.539
cmwd8cfvx0083tsxk1lo2e8f0	cmwd8cfv7006ttsxkqnhqaq7s	CPU	76.4	%	\N	2026-11-12 06:30:45.926	2026-11-12 07:32:02.539
cmwd8cfvx0084tsxkw6rpsvyz	cmwd8cfv7006ttsxkqnhqaq7s	CPU	76.9	%	\N	2026-11-12 07:01:24.224	2026-11-12 07:32:02.539
cmwd8cfvx0085tsxk1txnk8ee	cmwd8cfv7006ttsxkqnhqaq7s	CPU	73	%	\N	2026-11-12 07:32:02.522	2026-11-12 07:32:02.539
cmwd8cfvy0086tsxk9krvaprk	cmwd8cfv7006ttsxkqnhqaq7s	MEM	86.2	%	\N	2026-11-11 07:32:02.522	2026-11-12 07:32:02.539
cmwd8cfvy0087tsxkwd3i742r	cmwd8cfv7006ttsxkqnhqaq7s	MEM	89.3	%	\N	2026-11-11 08:02:40.819	2026-11-12 07:32:02.539
cmwd8cfvy0088tsxkymtn13jy	cmwd8cfv7006ttsxkqnhqaq7s	MEM	92.2	%	\N	2026-11-11 08:33:19.117	2026-11-12 07:32:02.539
cmwd8cfvy0089tsxk6j1xqtee	cmwd8cfv7006ttsxkqnhqaq7s	MEM	90.7	%	\N	2026-11-11 09:03:57.415	2026-11-12 07:32:02.539
cmwd8cfvy008atsxkegd2ltg6	cmwd8cfv7006ttsxkqnhqaq7s	MEM	93.1	%	\N	2026-11-11 09:34:35.713	2026-11-12 07:32:02.539
cmwd8cfvy008btsxkfyslfzpi	cmwd8cfv7006ttsxkqnhqaq7s	MEM	90.9	%	\N	2026-11-11 10:05:14.011	2026-11-12 07:32:02.539
cmwd8cfvy008ctsxkxea3zvu9	cmwd8cfv7006ttsxkqnhqaq7s	MEM	92.5	%	\N	2026-11-11 10:35:52.309	2026-11-12 07:32:02.539
cmwd8cfvy008dtsxkx3r71k89	cmwd8cfv7006ttsxkqnhqaq7s	MEM	89.5	%	\N	2026-11-11 11:06:30.607	2026-11-12 07:32:02.539
cmwd8cfvy008etsxkr5a88vak	cmwd8cfv7006ttsxkqnhqaq7s	MEM	90.5	%	\N	2026-11-11 11:37:08.904	2026-11-12 07:32:02.539
cmwd8cfvy008ftsxk2vxbnr31	cmwd8cfv7006ttsxkqnhqaq7s	MEM	91.2	%	\N	2026-11-11 12:07:47.202	2026-11-12 07:32:02.539
cmwd8cfvy008gtsxkip9m7c34	cmwd8cfv7006ttsxkqnhqaq7s	MEM	87.8	%	\N	2026-11-11 12:38:25.5	2026-11-12 07:32:02.539
cmwd8cfvy008htsxkj8l0ci58	cmwd8cfv7006ttsxkqnhqaq7s	MEM	88.5	%	\N	2026-11-11 13:09:03.798	2026-11-12 07:32:02.539
cmwd8cfvy008itsxkvgk7kpcn	cmwd8cfv7006ttsxkqnhqaq7s	MEM	85.3	%	\N	2026-11-11 13:39:42.096	2026-11-12 07:32:02.539
cmwd8cfvy008jtsxksaurm6up	cmwd8cfv7006ttsxkqnhqaq7s	MEM	86.6	%	\N	2026-11-11 14:10:20.394	2026-11-12 07:32:02.539
cmwd8cfvy008ktsxkpgspa4ci	cmwd8cfv7006ttsxkqnhqaq7s	MEM	84.1	%	\N	2026-11-11 14:40:58.692	2026-11-12 07:32:02.539
cmwd8cfvy008ltsxk8691jha8	cmwd8cfv7006ttsxkqnhqaq7s	MEM	86.1	%	\N	2026-11-11 15:11:36.99	2026-11-12 07:32:02.539
cmwd8cfvy008mtsxknv7qkapp	cmwd8cfv7006ttsxkqnhqaq7s	MEM	88.5	%	\N	2026-11-11 15:42:15.287	2026-11-12 07:32:02.539
cmwd8cfvy008ntsxk8yeoh1su	cmwd8cfv7006ttsxkqnhqaq7s	MEM	87.1	%	\N	2026-11-11 16:12:53.585	2026-11-12 07:32:02.539
cmwd8cfvy008otsxkjoo1gb2w	cmwd8cfv7006ttsxkqnhqaq7s	MEM	90.1	%	\N	2026-11-11 16:43:31.883	2026-11-12 07:32:02.539
cmwd8cfvy008ptsxketpw8obn	cmwd8cfv7006ttsxkqnhqaq7s	MEM	89	%	\N	2026-11-11 17:14:10.181	2026-11-12 07:32:02.539
cmwd8cfvy008qtsxk5cw377r1	cmwd8cfv7006ttsxkqnhqaq7s	MEM	92	%	\N	2026-11-11 17:44:48.479	2026-11-12 07:32:02.539
cmwd8cfvy008rtsxk2mjc9s3s	cmwd8cfv7006ttsxkqnhqaq7s	MEM	90.8	%	\N	2026-11-11 18:15:26.777	2026-11-12 07:32:02.539
cmwd8cfvy008stsxkkw18jovh	cmwd8cfv7006ttsxkqnhqaq7s	MEM	93.4	%	\N	2026-11-11 18:46:05.075	2026-11-12 07:32:02.539
cmwd8cfvy008ttsxksg5jb20i	cmwd8cfv7006ttsxkqnhqaq7s	MEM	95.7	%	\N	2026-11-11 19:16:43.373	2026-11-12 07:32:02.539
cmwd8cfvy008utsxkd8k8bhvb	cmwd8cfv7006ttsxkqnhqaq7s	MEM	93.5	%	\N	2026-11-11 19:47:21.67	2026-11-12 07:32:02.539
cmwd8cfvy008vtsxk8np1muxd	cmwd8cfv7006ttsxkqnhqaq7s	MEM	95	%	\N	2026-11-11 20:17:59.968	2026-11-12 07:32:02.539
cmwd8cfvy008wtsxk55njywui	cmwd8cfv7006ttsxkqnhqaq7s	MEM	92	%	\N	2026-11-11 20:48:38.266	2026-11-12 07:32:02.539
cmwd8cfvy008xtsxk5686n9tp	cmwd8cfv7006ttsxkqnhqaq7s	MEM	92.9	%	\N	2026-11-11 21:19:16.564	2026-11-12 07:32:02.539
cmwd8cfvy008ytsxkdtmmprx8	cmwd8cfv7006ttsxkqnhqaq7s	MEM	89.4	%	\N	2026-11-11 21:49:54.862	2026-11-12 07:32:02.539
cmwd8cfvy008ztsxkyh14veng	cmwd8cfv7006ttsxkqnhqaq7s	MEM	90.2	%	\N	2026-11-11 22:20:33.16	2026-11-12 07:32:02.539
cmwd8cfvy0090tsxk4dkeet1z	cmwd8cfv7006ttsxkqnhqaq7s	MEM	91	%	\N	2026-11-11 22:51:11.458	2026-11-12 07:32:02.539
cmwd8cfvy0091tsxke73yn8au	cmwd8cfv7006ttsxkqnhqaq7s	MEM	87.8	%	\N	2026-11-11 23:21:49.756	2026-11-12 07:32:02.539
cmwd8cfvy0092tsxkv875gtpd	cmwd8cfv7006ttsxkqnhqaq7s	MEM	89.1	%	\N	2026-11-11 23:52:28.053	2026-11-12 07:32:02.539
cmwd8cfvy0093tsxkdkxci2fb	cmwd8cfv7006ttsxkqnhqaq7s	MEM	86.6	%	\N	2026-11-12 00:23:06.351	2026-11-12 07:32:02.539
cmwd8cfvy0094tsxkc3xk1iq6	cmwd8cfv7006ttsxkqnhqaq7s	MEM	88.7	%	\N	2026-11-12 00:53:44.649	2026-11-12 07:32:02.539
cmwd8cfvy0095tsxk0710xs3n	cmwd8cfv7006ttsxkqnhqaq7s	MEM	87	%	\N	2026-11-12 01:24:22.947	2026-11-12 07:32:02.539
cmwd8cfvy0096tsxkufvmt1i6	cmwd8cfv7006ttsxkqnhqaq7s	MEM	89.8	%	\N	2026-11-12 01:55:01.245	2026-11-12 07:32:02.539
cmwd8cfvy0097tsxkl8y9fafz	cmwd8cfv7006ttsxkqnhqaq7s	MEM	92.8	%	\N	2026-11-12 02:25:39.543	2026-11-12 07:32:02.539
cmwd8cfvy0098tsxkyd0ly08y	cmwd8cfv7006ttsxkqnhqaq7s	MEM	91.7	%	\N	2026-11-12 02:56:17.841	2026-11-12 07:32:02.539
cmwd8cfvy0099tsxkpq0smpas	cmwd8cfv7006ttsxkqnhqaq7s	MEM	94.8	%	\N	2026-11-12 03:26:56.139	2026-11-12 07:32:02.539
cmwd8cfvz009atsxkoen51vi4	cmwd8cfv7006ttsxkqnhqaq7s	MEM	93.5	%	\N	2026-11-12 03:57:34.436	2026-11-12 07:32:02.539
cmwd8cfvz009btsxktt15cnoe	cmwd8cfv7006ttsxkqnhqaq7s	MEM	96.1	%	\N	2026-11-12 04:28:12.734	2026-11-12 07:32:02.539
cmwd8cfvz009ctsxkia8tqf0u	cmwd8cfv7006ttsxkqnhqaq7s	MEM	94.1	%	\N	2026-11-12 04:58:51.032	2026-11-12 07:32:02.539
cmwd8cfvz009dtsxk6mz1kb7n	cmwd8cfv7006ttsxkqnhqaq7s	MEM	96	%	\N	2026-11-12 05:29:29.33	2026-11-12 07:32:02.539
cmwd8cfvz009etsxkzqn1768u	cmwd8cfv7006ttsxkqnhqaq7s	MEM	97.5	%	\N	2026-11-12 06:00:07.628	2026-11-12 07:32:02.539
cmwd8cfvz009ftsxkwvlmom3p	cmwd8cfv7006ttsxkqnhqaq7s	MEM	94.4	%	\N	2026-11-12 06:30:45.926	2026-11-12 07:32:02.539
cmwd8cfvz009gtsxkok1xsgs0	cmwd8cfv7006ttsxkqnhqaq7s	MEM	95.3	%	\N	2026-11-12 07:01:24.224	2026-11-12 07:32:02.539
cmwd8cfvz009htsxk1tlhwjmo	cmwd8cfv7006ttsxkqnhqaq7s	MEM	91.8	%	\N	2026-11-12 07:32:02.522	2026-11-12 07:32:02.539
cmwd8cfvz009itsxk9s0o8bk4	cmwd8cfv7006ttsxkqnhqaq7s	DISK	77.2	%	\N	2026-11-11 07:32:02.523	2026-11-12 07:32:02.539
cmwd8cfvz009jtsxkku7gg4gm	cmwd8cfv7006ttsxkqnhqaq7s	DISK	79.6	%	\N	2026-11-11 08:02:40.82	2026-11-12 07:32:02.539
cmwd8cfvz009ktsxkdtfv3vgq	cmwd8cfv7006ttsxkqnhqaq7s	DISK	82	%	\N	2026-11-11 08:33:19.118	2026-11-12 07:32:02.539
cmwd8cfvz009ltsxk9kqptinu	cmwd8cfv7006ttsxkqnhqaq7s	DISK	80	%	\N	2026-11-11 09:03:57.416	2026-11-12 07:32:02.539
cmwd8cfvz009mtsxktgeo8sf5	cmwd8cfv7006ttsxkqnhqaq7s	DISK	82	%	\N	2026-11-11 09:34:35.714	2026-11-12 07:32:02.539
cmwd8cfvz009ntsxkrt08of1y	cmwd8cfv7006ttsxkqnhqaq7s	DISK	79.7	%	\N	2026-11-11 10:05:14.012	2026-11-12 07:32:02.539
cmwd8cfvz009otsxk8yicq7ow	cmwd8cfv7006ttsxkqnhqaq7s	DISK	81.4	%	\N	2026-11-11 10:35:52.31	2026-11-12 07:32:02.539
cmwd8cfvz009ptsxkl0j6ef95	cmwd8cfv7006ttsxkqnhqaq7s	DISK	78.6	%	\N	2026-11-11 11:06:30.608	2026-11-12 07:32:02.539
cmwd8cfvz009qtsxk6by3xtnr	cmwd8cfv7006ttsxkqnhqaq7s	DISK	80	%	\N	2026-11-11 11:37:08.905	2026-11-12 07:32:02.539
cmwd8cfvz009rtsxks24mec4e	cmwd8cfv7006ttsxkqnhqaq7s	DISK	81.2	%	\N	2026-11-11 12:07:47.203	2026-11-12 07:32:02.539
cmwd8cfvz009stsxk6dpta4de	cmwd8cfv7006ttsxkqnhqaq7s	DISK	78.3	%	\N	2026-11-11 12:38:25.501	2026-11-12 07:32:02.539
cmwd8cfvz009ttsxkava7rcnw	cmwd8cfv7006ttsxkqnhqaq7s	DISK	79.5	%	\N	2026-11-11 13:09:03.799	2026-11-12 07:32:02.539
cmwd8cfvz009utsxk9no9ub11	cmwd8cfv7006ttsxkqnhqaq7s	DISK	76.7	%	\N	2026-11-11 13:39:42.097	2026-11-12 07:32:02.539
cmwd8cfvz009vtsxknjg1pa3z	cmwd8cfv7006ttsxkqnhqaq7s	DISK	78.2	%	\N	2026-11-11 14:10:20.395	2026-11-12 07:32:02.539
cmwd8cfvz009wtsxk4a6js8ru	cmwd8cfv7006ttsxkqnhqaq7s	DISK	75.7	%	\N	2026-11-11 14:40:58.693	2026-11-12 07:32:02.539
cmwd8cfvz009xtsxk6c87xwej	cmwd8cfv7006ttsxkqnhqaq7s	DISK	77.6	%	\N	2026-11-11 15:11:36.991	2026-11-12 07:32:02.539
cmwd8cfvz009ytsxkxh0spch7	cmwd8cfv7006ttsxkqnhqaq7s	DISK	79.7	%	\N	2026-11-11 15:42:15.288	2026-11-12 07:32:02.539
cmwd8cfvz009ztsxkodh8iwwa	cmwd8cfv7006ttsxkqnhqaq7s	DISK	77.7	%	\N	2026-11-11 16:12:53.586	2026-11-12 07:32:02.539
cmwd8cfvz00a0tsxkond4qo4e	cmwd8cfv7006ttsxkqnhqaq7s	DISK	80.1	%	\N	2026-11-11 16:43:31.884	2026-11-12 07:32:02.539
cmwd8cfvz00a1tsxkq7honezx	cmwd8cfv7006ttsxkqnhqaq7s	DISK	78.3	%	\N	2026-11-11 17:14:10.182	2026-11-12 07:32:02.539
cmwd8cfvz00a2tsxk2xae5421	cmwd8cfv7006ttsxkqnhqaq7s	DISK	80.7	%	\N	2026-11-11 17:44:48.48	2026-11-12 07:32:02.539
cmwd8cfvz00a3tsxkus03u4h6	cmwd8cfv7006ttsxkqnhqaq7s	DISK	78.8	%	\N	2026-11-11 18:15:26.778	2026-11-12 07:32:02.539
cmwd8cfvz00a4tsxkkc6igubz	cmwd8cfv7006ttsxkqnhqaq7s	DISK	81	%	\N	2026-11-11 18:46:05.076	2026-11-12 07:32:02.539
cmwd8cfvz00a5tsxk96sfvtgj	cmwd8cfv7006ttsxkqnhqaq7s	DISK	83	%	\N	2026-11-11 19:16:43.374	2026-11-12 07:32:02.539
cmwd8cfvz00a6tsxk52vdfb88	cmwd8cfv7006ttsxkqnhqaq7s	DISK	80.7	%	\N	2026-11-11 19:47:21.671	2026-11-12 07:32:02.539
cmwd8cfvz00a7tsxkcwtgbzk7	cmwd8cfv7006ttsxkqnhqaq7s	DISK	82.3	%	\N	2026-11-11 20:17:59.969	2026-11-12 07:32:02.539
cmwd8cfvz00a8tsxkls52lfmu	cmwd8cfv7006ttsxkqnhqaq7s	DISK	79.6	%	\N	2026-11-11 20:48:38.267	2026-11-12 07:32:02.539
cmwd8cfvz00a9tsxkx6j58c3p	cmwd8cfv7006ttsxkqnhqaq7s	DISK	80.9	%	\N	2026-11-11 21:19:16.565	2026-11-12 07:32:02.539
cmwd8cfvz00aatsxkqvnredw0	cmwd8cfv7006ttsxkqnhqaq7s	DISK	77.9	%	\N	2026-11-11 21:49:54.863	2026-11-12 07:32:02.539
cmwd8cfvz00abtsxkowvw3o31	cmwd8cfv7006ttsxkqnhqaq7s	DISK	79.2	%	\N	2026-11-11 22:20:33.161	2026-11-12 07:32:02.539
cmwd8cfvz00actsxkvatqvxua	cmwd8cfv7006ttsxkqnhqaq7s	DISK	80.4	%	\N	2026-11-11 22:51:11.459	2026-11-12 07:32:02.539
cmwd8cfvz00adtsxk8agii2td	cmwd8cfv7006ttsxkqnhqaq7s	DISK	77.6	%	\N	2026-11-11 23:21:49.757	2026-11-12 07:32:02.539
cmwd8cfvz00aetsxkktk9g8ui	cmwd8cfv7006ttsxkqnhqaq7s	DISK	79.2	%	\N	2026-11-11 23:52:28.054	2026-11-12 07:32:02.539
cmwd8cfvz00aftsxkk21flrza	cmwd8cfv7006ttsxkqnhqaq7s	DISK	76.7	%	\N	2026-11-12 00:23:06.352	2026-11-12 07:32:02.539
cmwd8cfvz00agtsxkgehir9ei	cmwd8cfv7006ttsxkqnhqaq7s	DISK	78.6	%	\N	2026-11-12 00:53:44.65	2026-11-12 07:32:02.539
cmwd8cfvz00ahtsxksz7icgsl	cmwd8cfv7006ttsxkqnhqaq7s	DISK	76.5	%	\N	2026-11-12 01:24:22.948	2026-11-12 07:32:02.539
cmwd8cfw000aitsxkho9qdbav	cmwd8cfv7006ttsxkqnhqaq7s	DISK	78.8	%	\N	2026-11-12 01:55:01.246	2026-11-12 07:32:02.539
cmwd8cfw000ajtsxk8bm73h0g	cmwd8cfv7006ttsxkqnhqaq7s	DISK	81.2	%	\N	2026-11-12 02:25:39.544	2026-11-12 07:32:02.539
cmwd8cfw000aktsxkg0wmn2hs	cmwd8cfv7006ttsxkqnhqaq7s	DISK	79.4	%	\N	2026-11-12 02:56:17.842	2026-11-12 07:32:02.539
cmwd8cfw000altsxkcbcqwdrx	cmwd8cfv7006ttsxkqnhqaq7s	DISK	81.8	%	\N	2026-11-12 03:26:56.14	2026-11-12 07:32:02.539
cmwd8cfw000amtsxknsndcpst	cmwd8cfv7006ttsxkqnhqaq7s	DISK	79.9	%	\N	2026-11-12 03:57:34.437	2026-11-12 07:32:02.539
cmwd8cfw000antsxk2h4b3t8f	cmwd8cfv7006ttsxkqnhqaq7s	DISK	82.1	%	\N	2026-11-12 04:28:12.735	2026-11-12 07:32:02.539
cmwd8cfw000aotsxkoqyy6w0o	cmwd8cfv7006ttsxkqnhqaq7s	DISK	79.9	%	\N	2026-11-12 04:58:51.033	2026-11-12 07:32:02.539
cmwd8cfw000aptsxkmno2i82f	cmwd8cfv7006ttsxkqnhqaq7s	DISK	81.7	%	\N	2026-11-12 05:29:29.331	2026-11-12 07:32:02.539
cmwd8cfw000aqtsxkhq9f5pbe	cmwd8cfv7006ttsxkqnhqaq7s	DISK	83.3	%	\N	2026-11-12 06:00:07.629	2026-11-12 07:32:02.539
cmwd8cfw000artsxk84p6xesv	cmwd8cfv7006ttsxkqnhqaq7s	DISK	80.5	%	\N	2026-11-12 06:30:45.927	2026-11-12 07:32:02.539
cmwd8cfw000astsxkz4q8457o	cmwd8cfv7006ttsxkqnhqaq7s	DISK	81.8	%	\N	2026-11-12 07:01:24.225	2026-11-12 07:32:02.539
cmwd8cfw000attsxkfmb66pk6	cmwd8cfv7006ttsxkqnhqaq7s	DISK	78.9	%	\N	2026-11-12 07:32:02.523	2026-11-12 07:32:02.539
cmwd8cfw000autsxknase2i0q	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	32.6	MB/s	\N	2026-11-11 07:32:02.523	2026-11-12 07:32:02.539
cmwd8cfw000avtsxkxiyaqcev	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	36.4	MB/s	\N	2026-11-11 08:02:40.82	2026-11-12 07:32:02.539
cmwd8cfw000awtsxk8rsbnroo	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	39.9	MB/s	\N	2026-11-11 08:33:19.118	2026-11-12 07:32:02.539
cmwd8cfw000axtsxkcxzzrmxu	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	38.8	MB/s	\N	2026-11-11 09:03:57.416	2026-11-12 07:32:02.539
cmwd8cfw000aytsxkobx5q9nx	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	41.4	MB/s	\N	2026-11-11 09:34:35.714	2026-11-12 07:32:02.539
cmwd8cfw000aztsxk8qzlwnq4	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	39.2	MB/s	\N	2026-11-11 10:05:14.012	2026-11-12 07:32:02.539
cmwd8cfw000b0tsxkcam9evir	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	40.5	MB/s	\N	2026-11-11 10:35:52.31	2026-11-12 07:32:02.539
cmwd8cfw000b1tsxkvqx6qfwt	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	36.9	MB/s	\N	2026-11-11 11:06:30.608	2026-11-12 07:32:02.539
cmwd8cfw000b2tsxkykxlekm8	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	37.1	MB/s	\N	2026-11-11 11:37:08.905	2026-11-12 07:32:02.539
cmwd8cfw000b3tsxkc4e17s0t	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	37	MB/s	\N	2026-11-11 12:07:47.203	2026-11-12 07:32:02.539
cmwd8cfw000b4tsxkxws34pk7	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	32.7	MB/s	\N	2026-11-11 12:38:25.501	2026-11-12 07:32:02.539
cmwd8cfw000b5tsxkci6i5vi7	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	32.6	MB/s	\N	2026-11-11 13:09:03.799	2026-11-12 07:32:02.539
cmwd8cfw000b6tsxkbhq73pyc	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	28.7	MB/s	\N	2026-11-11 13:39:42.097	2026-11-12 07:32:02.539
cmwd8cfw000b7tsxkzzcx1avy	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	29.4	MB/s	\N	2026-11-11 14:10:20.395	2026-11-12 07:32:02.539
cmwd8cfw000b8tsxkw7httk1s	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	26.6	MB/s	\N	2026-11-11 14:40:58.693	2026-11-12 07:32:02.539
cmwd8cfw000b9tsxk7wwwujav	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	28.6	MB/s	\N	2026-11-11 15:11:36.991	2026-11-12 07:32:02.539
cmwd8cfw000batsxk0iow8eoa	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	31.3	MB/s	\N	2026-11-11 15:42:15.288	2026-11-12 07:32:02.539
cmwd8cfw000bbtsxk6cqcomt1	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	30.3	MB/s	\N	2026-11-11 16:12:53.586	2026-11-12 07:32:02.539
cmwd8cfw000bctsxk93rudm3q	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	33.9	MB/s	\N	2026-11-11 16:43:31.884	2026-11-12 07:32:02.539
cmwd8cfw000bdtsxkuvle8vvn	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	33.5	MB/s	\N	2026-11-11 17:14:10.182	2026-11-12 07:32:02.539
cmwd8cfw000betsxk4m3p8w6m	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	37.2	MB/s	\N	2026-11-11 17:44:48.48	2026-11-12 07:32:02.539
cmwd8cfw000bftsxkmy2ovavu	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	36.5	MB/s	\N	2026-11-11 18:15:26.778	2026-11-12 07:32:02.539
cmwd8cfw000bgtsxknk3uw50v	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	39.6	MB/s	\N	2026-11-11 18:46:05.076	2026-11-12 07:32:02.539
cmwd8cfw000bhtsxkfsf2fc9p	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	42.1	MB/s	\N	2026-11-11 19:16:43.374	2026-11-12 07:32:02.539
cmwd8cfw000bitsxkhleb18f1	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	39.7	MB/s	\N	2026-11-11 19:47:21.671	2026-11-12 07:32:02.539
cmwd8cfw000bjtsxk9scrodrn	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	40.9	MB/s	\N	2026-11-11 20:17:59.969	2026-11-12 07:32:02.539
cmwd8cfw100bktsxk2vrb3zhn	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	37.3	MB/s	\N	2026-11-11 20:48:38.267	2026-11-12 07:32:02.539
cmwd8cfw100bltsxknezef9u6	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	37.5	MB/s	\N	2026-11-11 21:19:16.565	2026-11-12 07:32:02.539
cmwd8cfw100bmtsxkbl1rllln	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	33.1	MB/s	\N	2026-11-11 21:49:54.863	2026-11-12 07:32:02.539
cmwd8cfw100bntsxk2z5q3lat	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	33	MB/s	\N	2026-11-11 22:20:33.161	2026-11-12 07:32:02.539
cmwd8cfw100botsxkk3chge70	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	32.9	MB/s	\N	2026-11-11 22:51:11.459	2026-11-12 07:32:02.539
cmwd8cfw100bptsxke2zhf7mh	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	29.1	MB/s	\N	2026-11-11 23:21:49.757	2026-11-12 07:32:02.539
cmwd8cfw100bqtsxkwdluke0k	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	29.9	MB/s	\N	2026-11-11 23:52:28.054	2026-11-12 07:32:02.539
cmwd8cfw100brtsxkls8w172q	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	27.2	MB/s	\N	2026-11-12 00:23:06.352	2026-11-12 07:32:02.539
cmwd8cfw100bstsxk066bczka	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	29.3	MB/s	\N	2026-11-12 00:53:44.65	2026-11-12 07:32:02.539
cmwd8cfw100bttsxkgt3ssqzz	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	27.9	MB/s	\N	2026-11-12 01:24:22.948	2026-11-12 07:32:02.539
cmwd8cfw100butsxkemp6tm21	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	31.2	MB/s	\N	2026-11-12 01:55:01.246	2026-11-12 07:32:02.539
cmwd8cfw100bvtsxkvzml8cik	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	34.8	MB/s	\N	2026-11-12 02:25:39.544	2026-11-12 07:32:02.539
cmwd8cfw100bwtsxkz3r8cdul	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	34.4	MB/s	\N	2026-11-12 02:56:17.842	2026-11-12 07:32:02.539
cmwd8cfw100bxtsxkgaxopwgn	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	38.1	MB/s	\N	2026-11-12 03:26:56.14	2026-11-12 07:32:02.539
cmwd8cfw100bytsxkjq190piq	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	37.4	MB/s	\N	2026-11-12 03:57:34.437	2026-11-12 07:32:02.539
cmwd8cfw100bztsxk0zthozze	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	40.3	MB/s	\N	2026-11-12 04:28:12.735	2026-11-12 07:32:02.539
cmwd8cfw100c0tsxkdyd9csba	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	38.5	MB/s	\N	2026-11-12 04:58:51.033	2026-11-12 07:32:02.539
cmwd8cfw100c1tsxkjzo6ieft	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	40.3	MB/s	\N	2026-11-12 05:29:29.331	2026-11-12 07:32:02.539
cmwd8cfw100c2tsxkxeo2y3od	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	41.4	MB/s	\N	2026-11-12 06:00:07.629	2026-11-12 07:32:02.539
cmwd8cfw100c3tsxkago8xgkf	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	37.7	MB/s	\N	2026-11-12 06:30:45.927	2026-11-12 07:32:02.539
cmwd8cfw100c4tsxk170kg4ws	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	37.8	MB/s	\N	2026-11-12 07:01:24.225	2026-11-12 07:32:02.539
cmwd8cfw100c5tsxka9y4sgj1	cmwd8cfv7006ttsxkqnhqaq7s	NET_IN	33.4	MB/s	\N	2026-11-12 07:32:02.523	2026-11-12 07:32:02.539
cmwd8cfw100c6tsxkfs3gbb1k	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	25.2	MB/s	\N	2026-11-11 07:32:02.523	2026-11-12 07:32:02.539
cmwd8cfw100c7tsxkwqvlcfeb	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	28.6	MB/s	\N	2026-11-11 08:02:40.82	2026-11-12 07:32:02.539
cmwd8cfw100c8tsxk0k4k77zl	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	31.8	MB/s	\N	2026-11-11 08:33:19.118	2026-11-12 07:32:02.539
cmwd8cfw100c9tsxk3fdybzxu	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	30.4	MB/s	\N	2026-11-11 09:03:57.416	2026-11-12 07:32:02.539
cmwd8cfw100catsxkx3mq6km0	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	32.9	MB/s	\N	2026-11-11 09:34:35.714	2026-11-12 07:32:02.539
cmwd8cfw100cbtsxkp3cjpb0c	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	30.6	MB/s	\N	2026-11-11 10:05:14.012	2026-11-12 07:32:02.539
cmwd8cfw100cctsxkdqj120m5	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	32	MB/s	\N	2026-11-11 10:35:52.31	2026-11-12 07:32:02.539
cmwd8cfw100cdtsxk8e0yjf9e	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	28.7	MB/s	\N	2026-11-11 11:06:30.608	2026-11-12 07:32:02.539
cmwd8cfw100cetsxk5a1934u3	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	29.2	MB/s	\N	2026-11-11 11:37:08.905	2026-11-12 07:32:02.539
cmwd8cfw100cftsxk7qeoklll	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	29.5	MB/s	\N	2026-11-11 12:07:47.203	2026-11-12 07:32:02.539
cmwd8cfw100cgtsxklvz6ixp7	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	25.5	MB/s	\N	2026-11-11 12:38:25.501	2026-11-12 07:32:02.539
cmwd8cfw100chtsxkfq8mhyc0	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	25.8	MB/s	\N	2026-11-11 13:09:03.799	2026-11-12 07:32:02.539
cmwd8cfw100citsxko0mjkrje	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	22.2	MB/s	\N	2026-11-11 13:39:42.097	2026-11-12 07:32:02.539
cmwd8cfw100cjtsxk71l0yyt8	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	23.1	MB/s	\N	2026-11-11 14:10:20.395	2026-11-12 07:32:02.539
cmwd8cfw100cktsxk606ihyf1	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	20.4	MB/s	\N	2026-11-11 14:40:58.693	2026-11-12 07:32:02.539
cmwd8cfw100cltsxkaydofrsu	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	22.4	MB/s	\N	2026-11-11 15:11:36.991	2026-11-12 07:32:02.539
cmwd8cfw100cmtsxk27hk077r	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	24.9	MB/s	\N	2026-11-11 15:42:15.288	2026-11-12 07:32:02.539
cmwd8cfw100cntsxk9pyl4lvj	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	23.6	MB/s	\N	2026-11-11 16:12:53.586	2026-11-12 07:32:02.539
cmwd8cfw100cotsxk4w800gk5	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	26.9	MB/s	\N	2026-11-11 16:43:31.884	2026-11-12 07:32:02.539
cmwd8cfw200cptsxkvjueguqd	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	26	MB/s	\N	2026-11-11 17:14:10.182	2026-11-12 07:32:02.539
cmwd8cfw200cqtsxkuqdu2gc4	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	29.4	MB/s	\N	2026-11-11 17:44:48.48	2026-11-12 07:32:02.539
cmwd8cfw200crtsxkwdutb5n5	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	28.4	MB/s	\N	2026-11-11 18:15:26.778	2026-11-12 07:32:02.539
cmwd8cfw200cstsxkgdadlq7i	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	31.2	MB/s	\N	2026-11-11 18:46:05.076	2026-11-12 07:32:02.539
cmwd8cfw200cttsxkibtieze1	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	33.5	MB/s	\N	2026-11-11 19:16:43.374	2026-11-12 07:32:02.539
cmwd8cfw200cutsxk82uyypc2	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	31.1	MB/s	\N	2026-11-11 19:47:21.671	2026-11-12 07:32:02.539
cmwd8cfw200cvtsxk726u7vcr	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	32.5	MB/s	\N	2026-11-11 20:17:59.969	2026-11-12 07:32:02.539
cmwd8cfw200cwtsxk63ev04xe	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	29.1	MB/s	\N	2026-11-11 20:48:38.267	2026-11-12 07:32:02.539
cmwd8cfw200cxtsxk7r24i73b	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	29.6	MB/s	\N	2026-11-11 21:19:16.565	2026-11-12 07:32:02.539
cmwd8cfw200cytsxk1fhh0d36	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	25.6	MB/s	\N	2026-11-11 21:49:54.863	2026-11-12 07:32:02.539
cmwd8cfw200cztsxkcowbzuae	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	25.9	MB/s	\N	2026-11-11 22:20:33.161	2026-11-12 07:32:02.539
cmwd8cfw200d0tsxkklp2wvx4	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	26.2	MB/s	\N	2026-11-11 22:51:11.459	2026-11-12 07:32:02.539
cmwd8cfw200d1tsxkof74mkvg	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	22.6	MB/s	\N	2026-11-11 23:21:49.757	2026-11-12 07:32:02.539
cmwd8cfw200d2tsxk1u2g500w	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	23.7	MB/s	\N	2026-11-11 23:52:28.054	2026-11-12 07:32:02.539
cmwd8cfw200d3tsxkh8g1tsdt	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	21	MB/s	\N	2026-11-12 00:23:06.352	2026-11-12 07:32:02.539
cmwd8cfw200d4tsxk6aoqonh6	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	23.1	MB/s	\N	2026-11-12 00:53:44.65	2026-11-12 07:32:02.539
cmwd8cfw200d5tsxkie74zfqf	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	21.4	MB/s	\N	2026-11-12 01:24:22.948	2026-11-12 07:32:02.539
cmwd8cfw200d6tsxkpq79n7po	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	24.4	MB/s	\N	2026-11-12 01:55:01.246	2026-11-12 07:32:02.539
cmwd8cfw200d7tsxksbryths4	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	27.7	MB/s	\N	2026-11-12 02:25:39.544	2026-11-12 07:32:02.539
cmwd8cfw200d8tsxkmtj6jczl	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	26.9	MB/s	\N	2026-11-12 02:56:17.842	2026-11-12 07:32:02.539
cmwd8cfw200d9tsxk0dsfzqvj	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	30.2	MB/s	\N	2026-11-12 03:26:56.14	2026-11-12 07:32:02.539
cmwd8cfw200datsxk6h7qxfe4	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	29.1	MB/s	\N	2026-11-12 03:57:34.437	2026-11-12 07:32:02.539
cmwd8cfw200dbtsxk2q0bg4jp	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	31.9	MB/s	\N	2026-11-12 04:28:12.735	2026-11-12 07:32:02.539
cmwd8cfw200dctsxkh2g34ucw	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	30	MB/s	\N	2026-11-12 04:58:51.033	2026-11-12 07:32:02.539
cmwd8cfw200ddtsxk1nehftci	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	31.7	MB/s	\N	2026-11-12 05:29:29.331	2026-11-12 07:32:02.539
cmwd8cfw200detsxkon03qub0	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	32.9	MB/s	\N	2026-11-12 06:00:07.629	2026-11-12 07:32:02.539
cmwd8cfw200dftsxk22vss5ol	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	29.5	MB/s	\N	2026-11-12 06:30:45.927	2026-11-12 07:32:02.539
cmwd8cfw200dgtsxkub7p0414	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	30	MB/s	\N	2026-11-12 07:01:24.225	2026-11-12 07:32:02.539
cmwd8cfw200dhtsxkalpyd0fq	cmwd8cfv7006ttsxkqnhqaq7s	NET_OUT	26	MB/s	\N	2026-11-12 07:32:02.523	2026-11-12 07:32:02.539
cmwd8cfz900djtsxk2j6pqa1p	cmwd8cfyr00ditsxkig9uqeve	CPU	20.2	%	\N	2026-11-11 07:32:02.646	2026-11-12 07:32:02.659
cmwd8cfz900dktsxkhqsxqums	cmwd8cfyr00ditsxkig9uqeve	CPU	23.6	%	\N	2026-11-11 08:02:40.943	2026-11-12 07:32:02.659
cmwd8cfz900dltsxkt723ci1g	cmwd8cfyr00ditsxkig9uqeve	CPU	26.9	%	\N	2026-11-11 08:33:19.241	2026-11-12 07:32:02.659
cmwd8cfz900dmtsxkl2agd7zq	cmwd8cfyr00ditsxkig9uqeve	CPU	25.6	%	\N	2026-11-11 09:03:57.539	2026-11-12 07:32:02.659
cmwd8cfz900dntsxkvjlrw2si	cmwd8cfyr00ditsxkig9uqeve	CPU	28	%	\N	2026-11-11 09:34:35.837	2026-11-12 07:32:02.659
cmwd8cfz900dotsxkg1ylgxur	cmwd8cfyr00ditsxkig9uqeve	CPU	25.8	%	\N	2026-11-11 10:05:14.135	2026-11-12 07:32:02.659
cmwd8cfz900dptsxko1crlbz9	cmwd8cfyr00ditsxkig9uqeve	CPU	27.2	%	\N	2026-11-11 10:35:52.433	2026-11-12 07:32:02.659
cmwd8cfz900dqtsxkiy49dtcz	cmwd8cfyr00ditsxkig9uqeve	CPU	24	%	\N	2026-11-11 11:06:30.731	2026-11-12 07:32:02.659
cmwd8cfz900drtsxkvj1v0x4i	cmwd8cfyr00ditsxkig9uqeve	CPU	24.5	%	\N	2026-11-11 11:37:09.028	2026-11-12 07:32:02.659
cmwd8cfz900dstsxkn1u718ev	cmwd8cfyr00ditsxkig9uqeve	CPU	24.9	%	\N	2026-11-11 12:07:47.326	2026-11-12 07:32:02.659
cmwd8cfz900dttsxklqhmlwc0	cmwd8cfyr00ditsxkig9uqeve	CPU	20.9	%	\N	2026-11-11 12:38:25.624	2026-11-12 07:32:02.659
cmwd8cfz900dutsxk1q3ntrog	cmwd8cfyr00ditsxkig9uqeve	CPU	21.3	%	\N	2026-11-11 13:09:03.922	2026-11-12 07:32:02.659
cmwd8cfz900dvtsxkjqocna7v	cmwd8cfyr00ditsxkig9uqeve	CPU	17.7	%	\N	2026-11-11 13:39:42.22	2026-11-12 07:32:02.659
cmwd8cfz900dwtsxk16vuf2gj	cmwd8cfyr00ditsxkig9uqeve	CPU	18.7	%	\N	2026-11-11 14:10:20.518	2026-11-12 07:32:02.659
cmwd8cfz900dxtsxkahx6r2bl	cmwd8cfyr00ditsxkig9uqeve	CPU	16	%	\N	2026-11-11 14:40:58.816	2026-11-12 07:32:02.659
cmwd8cfz900dytsxkaosssn0u	cmwd8cfyr00ditsxkig9uqeve	CPU	18	%	\N	2026-11-11 15:11:37.114	2026-11-12 07:32:02.659
cmwd8cfz900dztsxk8mu0ahn6	cmwd8cfyr00ditsxkig9uqeve	CPU	20.6	%	\N	2026-11-11 15:42:15.411	2026-11-12 07:32:02.659
cmwd8cfz900e0tsxkjz8twdmv	cmwd8cfyr00ditsxkig9uqeve	CPU	19.3	%	\N	2026-11-11 16:12:53.709	2026-11-12 07:32:02.659
cmwd8cfz900e1tsxk8mjidxnp	cmwd8cfyr00ditsxkig9uqeve	CPU	22.6	%	\N	2026-11-11 16:43:32.007	2026-11-12 07:32:02.659
cmwd8cfz900e2tsxk6bjj5re6	cmwd8cfyr00ditsxkig9uqeve	CPU	21.8	%	\N	2026-11-11 17:14:10.305	2026-11-12 07:32:02.659
cmwd8cfz900e3tsxkpczv9ch3	cmwd8cfyr00ditsxkig9uqeve	CPU	25.2	%	\N	2026-11-11 17:44:48.603	2026-11-12 07:32:02.659
cmwd8cfz900e4tsxkgtc4kyio	cmwd8cfyr00ditsxkig9uqeve	CPU	24.2	%	\N	2026-11-11 18:15:26.901	2026-11-12 07:32:02.659
cmwd8cfz900e5tsxk4rtjpd33	cmwd8cfyr00ditsxkig9uqeve	CPU	27.1	%	\N	2026-11-11 18:46:05.199	2026-11-12 07:32:02.659
cmwd8cfz900e6tsxky8j78d1m	cmwd8cfyr00ditsxkig9uqeve	CPU	29.5	%	\N	2026-11-11 19:16:43.497	2026-11-12 07:32:02.659
cmwd8cfz900e7tsxkw347ykw1	cmwd8cfyr00ditsxkig9uqeve	CPU	27.1	%	\N	2026-11-11 19:47:21.794	2026-11-12 07:32:02.659
cmwd8cfz900e8tsxk1ud7dgpo	cmwd8cfyr00ditsxkig9uqeve	CPU	28.5	%	\N	2026-11-11 20:18:00.092	2026-11-12 07:32:02.659
cmwd8cfz900e9tsxkqcz94sk1	cmwd8cfyr00ditsxkig9uqeve	CPU	25.2	%	\N	2026-11-11 20:48:38.39	2026-11-12 07:32:02.659
cmwd8cfz900eatsxk3cl9ume9	cmwd8cfyr00ditsxkig9uqeve	CPU	25.7	%	\N	2026-11-11 21:19:16.688	2026-11-12 07:32:02.659
cmwd8cfz900ebtsxk0t99y36n	cmwd8cfyr00ditsxkig9uqeve	CPU	21.8	%	\N	2026-11-11 21:49:54.986	2026-11-12 07:32:02.659
cmwd8cfz900ectsxkqmsdedt4	cmwd8cfyr00ditsxkig9uqeve	CPU	22.1	%	\N	2026-11-11 22:20:33.284	2026-11-12 07:32:02.659
cmwd8cfz900edtsxkpx92hjdt	cmwd8cfyr00ditsxkig9uqeve	CPU	22.4	%	\N	2026-11-11 22:51:11.582	2026-11-12 07:32:02.659
cmwd8cfz900eetsxk9zgc71fy	cmwd8cfyr00ditsxkig9uqeve	CPU	18.9	%	\N	2026-11-11 23:21:49.88	2026-11-12 07:32:02.659
cmwd8cfza00eftsxkq9t12iui	cmwd8cfyr00ditsxkig9uqeve	CPU	20	%	\N	2026-11-11 23:52:28.177	2026-11-12 07:32:02.659
cmwd8cfza00egtsxkgzf5y72r	cmwd8cfyr00ditsxkig9uqeve	CPU	17.4	%	\N	2026-11-12 00:23:06.475	2026-11-12 07:32:02.659
cmwd8cfza00ehtsxkfmu73p2x	cmwd8cfyr00ditsxkig9uqeve	CPU	19.5	%	\N	2026-11-12 00:53:44.773	2026-11-12 07:32:02.659
cmwd8cfza00eitsxkzuhpa470	cmwd8cfyr00ditsxkig9uqeve	CPU	17.9	%	\N	2026-11-12 01:24:23.071	2026-11-12 07:32:02.659
cmwd8cfza00ejtsxkxwwuueok	cmwd8cfyr00ditsxkig9uqeve	CPU	20.9	%	\N	2026-11-12 01:55:01.369	2026-11-12 07:32:02.659
cmwd8cfza00ektsxkvv7y1ugy	cmwd8cfyr00ditsxkig9uqeve	CPU	24.2	%	\N	2026-11-12 02:25:39.667	2026-11-12 07:32:02.659
cmwd8cfza00eltsxkob2agmtr	cmwd8cfyr00ditsxkig9uqeve	CPU	23.5	%	\N	2026-11-12 02:56:17.965	2026-11-12 07:32:02.659
cmwd8cfza00emtsxkppt29vpu	cmwd8cfyr00ditsxkig9uqeve	CPU	26.8	%	\N	2026-11-12 03:26:56.263	2026-11-12 07:32:02.659
cmwd8cfza00entsxk0jzblllg	cmwd8cfyr00ditsxkig9uqeve	CPU	25.8	%	\N	2026-11-12 03:57:34.56	2026-11-12 07:32:02.659
cmwd8cfza00eotsxkrfzu7qki	cmwd8cfyr00ditsxkig9uqeve	CPU	28.6	%	\N	2026-11-12 04:28:12.858	2026-11-12 07:32:02.659
cmwd8cfza00eptsxkrxnuzrla	cmwd8cfyr00ditsxkig9uqeve	CPU	26.7	%	\N	2026-11-12 04:58:51.156	2026-11-12 07:32:02.659
cmwd8cfza00eqtsxkoz1i5cyj	cmwd8cfyr00ditsxkig9uqeve	CPU	28.5	%	\N	2026-11-12 05:29:29.454	2026-11-12 07:32:02.659
cmwd8cfza00ertsxk51j1pnoa	cmwd8cfyr00ditsxkig9uqeve	CPU	29.8	%	\N	2026-11-12 06:00:07.752	2026-11-12 07:32:02.659
cmwd8cfza00estsxk3gnpclin	cmwd8cfyr00ditsxkig9uqeve	CPU	26.4	%	\N	2026-11-12 06:30:46.05	2026-11-12 07:32:02.659
cmwd8cfza00ettsxkdlikkgpl	cmwd8cfyr00ditsxkig9uqeve	CPU	26.9	%	\N	2026-11-12 07:01:24.348	2026-11-12 07:32:02.659
cmwd8cfza00eutsxksx4ji3lu	cmwd8cfyr00ditsxkig9uqeve	CPU	23	%	\N	2026-11-12 07:32:02.646	2026-11-12 07:32:02.659
cmwd8cfza00evtsxkfxnft1go	cmwd8cfyr00ditsxkig9uqeve	MEM	39.2	%	\N	2026-11-11 07:32:02.647	2026-11-12 07:32:02.659
cmwd8cfza00ewtsxk8u8my6p6	cmwd8cfyr00ditsxkig9uqeve	MEM	42.2	%	\N	2026-11-11 08:02:40.944	2026-11-12 07:32:02.659
cmwd8cfza00extsxk63vtaoat	cmwd8cfyr00ditsxkig9uqeve	MEM	45.1	%	\N	2026-11-11 08:33:19.242	2026-11-12 07:32:02.659
cmwd8cfza00eytsxkxaun74ta	cmwd8cfyr00ditsxkig9uqeve	MEM	43.5	%	\N	2026-11-11 09:03:57.54	2026-11-12 07:32:02.659
cmwd8cfza00eztsxk7dwgzvay	cmwd8cfyr00ditsxkig9uqeve	MEM	45.8	%	\N	2026-11-11 09:34:35.838	2026-11-12 07:32:02.659
cmwd8cfza00f0tsxkd0ixn7g2	cmwd8cfyr00ditsxkig9uqeve	MEM	43.5	%	\N	2026-11-11 10:05:14.136	2026-11-12 07:32:02.659
cmwd8cfza00f1tsxks6gaktnn	cmwd8cfyr00ditsxkig9uqeve	MEM	45	%	\N	2026-11-11 10:35:52.434	2026-11-12 07:32:02.659
cmwd8cfza00f2tsxk4sixjnk3	cmwd8cfyr00ditsxkig9uqeve	MEM	41.9	%	\N	2026-11-11 11:06:30.732	2026-11-12 07:32:02.659
cmwd8cfza00f3tsxkg2x7vnq3	cmwd8cfyr00ditsxkig9uqeve	MEM	42.8	%	\N	2026-11-11 11:37:09.029	2026-11-12 07:32:02.659
cmwd8cfza00f4tsxkpq52vfzh	cmwd8cfyr00ditsxkig9uqeve	MEM	43.5	%	\N	2026-11-11 12:07:47.327	2026-11-12 07:32:02.659
cmwd8cfza00f5tsxkhv2j2zj9	cmwd8cfyr00ditsxkig9uqeve	MEM	39.9	%	\N	2026-11-11 12:38:25.625	2026-11-12 07:32:02.659
cmwd8cfza00f6tsxkebcz5pdh	cmwd8cfyr00ditsxkig9uqeve	MEM	40.6	%	\N	2026-11-11 13:09:03.923	2026-11-12 07:32:02.659
cmwd8cfza00f7tsxk8zpchml7	cmwd8cfyr00ditsxkig9uqeve	MEM	37.3	%	\N	2026-11-11 13:39:42.221	2026-11-12 07:32:02.659
cmwd8cfza00f8tsxkigkmo8h9	cmwd8cfyr00ditsxkig9uqeve	MEM	38.5	%	\N	2026-11-11 14:10:20.519	2026-11-12 07:32:02.659
cmwd8cfza00f9tsxkzr4bc9bg	cmwd8cfyr00ditsxkig9uqeve	MEM	35.9	%	\N	2026-11-11 14:40:58.817	2026-11-12 07:32:02.659
cmwd8cfza00fatsxkaerahesr	cmwd8cfyr00ditsxkig9uqeve	MEM	37.9	%	\N	2026-11-11 15:11:37.115	2026-11-12 07:32:02.659
cmwd8cfza00fbtsxkkgcw05q3	cmwd8cfyr00ditsxkig9uqeve	MEM	40.2	%	\N	2026-11-11 15:42:15.412	2026-11-12 07:32:02.659
cmwd8cfza00fctsxkxhp1k8mf	cmwd8cfyr00ditsxkig9uqeve	MEM	38.7	%	\N	2026-11-11 16:12:53.71	2026-11-12 07:32:02.659
cmwd8cfza00fdtsxkx6h9k24c	cmwd8cfyr00ditsxkig9uqeve	MEM	41.6	%	\N	2026-11-11 16:43:32.008	2026-11-12 07:32:02.659
cmwd8cfza00fetsxkv8yxrpmf	cmwd8cfyr00ditsxkig9uqeve	MEM	40.4	%	\N	2026-11-11 17:14:10.306	2026-11-12 07:32:02.659
cmwd8cfza00fftsxkln2z3jpf	cmwd8cfyr00ditsxkig9uqeve	MEM	43.4	%	\N	2026-11-11 17:44:48.604	2026-11-12 07:32:02.659
cmwd8cfza00fgtsxkqxxrblki	cmwd8cfyr00ditsxkig9uqeve	MEM	42	%	\N	2026-11-11 18:15:26.902	2026-11-12 07:32:02.659
cmwd8cfza00fhtsxktnovyspc	cmwd8cfyr00ditsxkig9uqeve	MEM	44.6	%	\N	2026-11-11 18:46:05.2	2026-11-12 07:32:02.659
cmwd8cfzb00fitsxk1ee7ltgb	cmwd8cfyr00ditsxkig9uqeve	MEM	46.8	%	\N	2026-11-11 19:16:43.498	2026-11-12 07:32:02.659
cmwd8cfzb00fjtsxk4rkgdrsc	cmwd8cfyr00ditsxkig9uqeve	MEM	44.5	%	\N	2026-11-11 19:47:21.795	2026-11-12 07:32:02.659
cmwd8cfzb00fktsxkeh25ejrn	cmwd8cfyr00ditsxkig9uqeve	MEM	45.9	%	\N	2026-11-11 20:18:00.093	2026-11-12 07:32:02.659
cmwd8cfzb00fltsxk0mz1rdg4	cmwd8cfyr00ditsxkig9uqeve	MEM	42.8	%	\N	2026-11-11 20:48:38.391	2026-11-12 07:32:02.659
cmwd8cfzb00fmtsxk90e16z7r	cmwd8cfyr00ditsxkig9uqeve	MEM	43.6	%	\N	2026-11-11 21:19:16.689	2026-11-12 07:32:02.659
cmwd8cfzb00fntsxktib9ugq7	cmwd8cfyr00ditsxkig9uqeve	MEM	40.1	%	\N	2026-11-11 21:49:54.987	2026-11-12 07:32:02.659
cmwd8cfzb00fotsxkzjzkodcx	cmwd8cfyr00ditsxkig9uqeve	MEM	40.7	%	\N	2026-11-11 22:20:33.285	2026-11-12 07:32:02.659
cmwd8cfzb00fptsxkxrbaomis	cmwd8cfyr00ditsxkig9uqeve	MEM	41.5	%	\N	2026-11-11 22:51:11.583	2026-11-12 07:32:02.659
cmwd8cfzb00fqtsxktl3lxbpu	cmwd8cfyr00ditsxkig9uqeve	MEM	38.2	%	\N	2026-11-11 23:21:49.881	2026-11-12 07:32:02.659
cmwd8cfzb00frtsxk6h0gpxjt	cmwd8cfyr00ditsxkig9uqeve	MEM	39.5	%	\N	2026-11-11 23:52:28.178	2026-11-12 07:32:02.659
cmwd8cfzb00fstsxkockhrklw	cmwd8cfyr00ditsxkig9uqeve	MEM	36.9	%	\N	2026-11-12 00:23:06.476	2026-11-12 07:32:02.659
cmwd8cfzb00fttsxks8zuychz	cmwd8cfyr00ditsxkig9uqeve	MEM	38.9	%	\N	2026-11-12 00:53:44.774	2026-11-12 07:32:02.659
cmwd8cfzb00futsxkzpydlpa8	cmwd8cfyr00ditsxkig9uqeve	MEM	37.1	%	\N	2026-11-12 01:24:23.072	2026-11-12 07:32:02.659
cmwd8cfzb00fvtsxkdlr578cb	cmwd8cfyr00ditsxkig9uqeve	MEM	39.8	%	\N	2026-11-12 01:55:01.37	2026-11-12 07:32:02.659
cmwd8cfzb00fwtsxkvj5ndyla	cmwd8cfyr00ditsxkig9uqeve	MEM	42.7	%	\N	2026-11-12 02:25:39.668	2026-11-12 07:32:02.659
cmwd8cfzb00fxtsxkjkm3hnn4	cmwd8cfyr00ditsxkig9uqeve	MEM	41.6	%	\N	2026-11-12 02:56:17.966	2026-11-12 07:32:02.659
cmwd8cfzb00fytsxkdww7ztia	cmwd8cfyr00ditsxkig9uqeve	MEM	44.5	%	\N	2026-11-12 03:26:56.264	2026-11-12 07:32:02.659
cmwd8cfzb00fztsxkdr2f3xyj	cmwd8cfyr00ditsxkig9uqeve	MEM	43.1	%	\N	2026-11-12 03:57:34.561	2026-11-12 07:32:02.659
cmwd8cfzb00g0tsxkabfadxxo	cmwd8cfyr00ditsxkig9uqeve	MEM	45.7	%	\N	2026-11-12 04:28:12.859	2026-11-12 07:32:02.659
cmwd8cfzb00g1tsxkwso6j4e1	cmwd8cfyr00ditsxkig9uqeve	MEM	43.6	%	\N	2026-11-12 04:58:51.157	2026-11-12 07:32:02.659
cmwd8cfzb00g2tsxk7pdxgsj6	cmwd8cfyr00ditsxkig9uqeve	MEM	45.4	%	\N	2026-11-12 05:29:29.455	2026-11-12 07:32:02.659
cmwd8cfzb00g3tsxk2igt6el2	cmwd8cfyr00ditsxkig9uqeve	MEM	46.8	%	\N	2026-11-12 06:00:07.753	2026-11-12 07:32:02.659
cmwd8cfzb00g4tsxks50yoke6	cmwd8cfyr00ditsxkig9uqeve	MEM	43.7	%	\N	2026-11-12 06:30:46.051	2026-11-12 07:32:02.659
cmwd8cfzb00g5tsxkmqpmt7bi	cmwd8cfyr00ditsxkig9uqeve	MEM	44.5	%	\N	2026-11-12 07:01:24.349	2026-11-12 07:32:02.659
cmwd8cfzb00g6tsxks8qoznnf	cmwd8cfyr00ditsxkig9uqeve	MEM	40.9	%	\N	2026-11-12 07:32:02.647	2026-11-12 07:32:02.659
cmwd8cfzb00g7tsxk3xnc2mff	cmwd8cfyr00ditsxkig9uqeve	DISK	33.2	%	\N	2026-11-11 07:32:02.647	2026-11-12 07:32:02.659
cmwd8cfzb00g8tsxkj29tjyep	cmwd8cfyr00ditsxkig9uqeve	DISK	35.6	%	\N	2026-11-11 08:02:40.944	2026-11-12 07:32:02.659
cmwd8cfzb00g9tsxkcf3vu0mw	cmwd8cfyr00ditsxkig9uqeve	DISK	38	%	\N	2026-11-11 08:33:19.242	2026-11-12 07:32:02.659
cmwd8cfzb00gatsxki63jq52c	cmwd8cfyr00ditsxkig9uqeve	DISK	36	%	\N	2026-11-11 09:03:57.54	2026-11-12 07:32:02.659
cmwd8cfzb00gbtsxk00diaj70	cmwd8cfyr00ditsxkig9uqeve	DISK	38	%	\N	2026-11-11 09:34:35.838	2026-11-12 07:32:02.659
cmwd8cfzb00gctsxk2fw4gsal	cmwd8cfyr00ditsxkig9uqeve	DISK	35.7	%	\N	2026-11-11 10:05:14.136	2026-11-12 07:32:02.659
cmwd8cfzb00gdtsxktykfamuo	cmwd8cfyr00ditsxkig9uqeve	DISK	37.4	%	\N	2026-11-11 10:35:52.434	2026-11-12 07:32:02.659
cmwd8cfzb00getsxkrt5dzqb0	cmwd8cfyr00ditsxkig9uqeve	DISK	34.6	%	\N	2026-11-11 11:06:30.732	2026-11-12 07:32:02.659
cmwd8cfzb00gftsxkyjjhkn1b	cmwd8cfyr00ditsxkig9uqeve	DISK	36	%	\N	2026-11-11 11:37:09.029	2026-11-12 07:32:02.659
cmwd8cfzb00ggtsxkku1cwdfg	cmwd8cfyr00ditsxkig9uqeve	DISK	37.2	%	\N	2026-11-11 12:07:47.327	2026-11-12 07:32:02.659
cmwd8cfzb00ghtsxkt5acfvxp	cmwd8cfyr00ditsxkig9uqeve	DISK	34.3	%	\N	2026-11-11 12:38:25.625	2026-11-12 07:32:02.659
cmwd8cfzb00gitsxkdv0fiwam	cmwd8cfyr00ditsxkig9uqeve	DISK	35.5	%	\N	2026-11-11 13:09:03.923	2026-11-12 07:32:02.659
cmwd8cfzb00gjtsxktvjqnjdb	cmwd8cfyr00ditsxkig9uqeve	DISK	32.7	%	\N	2026-11-11 13:39:42.221	2026-11-12 07:32:02.659
cmwd8cfzb00gktsxk9y2q358j	cmwd8cfyr00ditsxkig9uqeve	DISK	34.2	%	\N	2026-11-11 14:10:20.519	2026-11-12 07:32:02.659
cmwd8cfzb00gltsxku4ryxtk5	cmwd8cfyr00ditsxkig9uqeve	DISK	31.7	%	\N	2026-11-11 14:40:58.817	2026-11-12 07:32:02.659
cmwd8cfzb00gmtsxk7ps2w6j8	cmwd8cfyr00ditsxkig9uqeve	DISK	33.6	%	\N	2026-11-11 15:11:37.115	2026-11-12 07:32:02.659
cmwd8cfzb00gntsxk5q34azq4	cmwd8cfyr00ditsxkig9uqeve	DISK	35.7	%	\N	2026-11-11 15:42:15.412	2026-11-12 07:32:02.659
cmwd8cfzc00gotsxkboe9s5hg	cmwd8cfyr00ditsxkig9uqeve	DISK	33.7	%	\N	2026-11-11 16:12:53.71	2026-11-12 07:32:02.659
cmwd8cfzc00gptsxk1i4yppaa	cmwd8cfyr00ditsxkig9uqeve	DISK	36.1	%	\N	2026-11-11 16:43:32.008	2026-11-12 07:32:02.659
cmwd8cfzc00gqtsxkydgin97f	cmwd8cfyr00ditsxkig9uqeve	DISK	34.3	%	\N	2026-11-11 17:14:10.306	2026-11-12 07:32:02.659
cmwd8cfzc00grtsxkv564u3p3	cmwd8cfyr00ditsxkig9uqeve	DISK	36.7	%	\N	2026-11-11 17:44:48.604	2026-11-12 07:32:02.659
cmwd8cfzc00gstsxknm4dxzxp	cmwd8cfyr00ditsxkig9uqeve	DISK	34.8	%	\N	2026-11-11 18:15:26.902	2026-11-12 07:32:02.659
cmwd8cfzc00gttsxk2u10b1ux	cmwd8cfyr00ditsxkig9uqeve	DISK	37	%	\N	2026-11-11 18:46:05.2	2026-11-12 07:32:02.659
cmwd8cfzc00gutsxk1yklwdna	cmwd8cfyr00ditsxkig9uqeve	DISK	39	%	\N	2026-11-11 19:16:43.498	2026-11-12 07:32:02.659
cmwd8cfzc00gvtsxk0pxa8e3v	cmwd8cfyr00ditsxkig9uqeve	DISK	36.7	%	\N	2026-11-11 19:47:21.795	2026-11-12 07:32:02.659
cmwd8cfzc00gwtsxkbgz4go0e	cmwd8cfyr00ditsxkig9uqeve	DISK	38.3	%	\N	2026-11-11 20:18:00.093	2026-11-12 07:32:02.659
cmwd8cfzc00gxtsxklnriujna	cmwd8cfyr00ditsxkig9uqeve	DISK	35.6	%	\N	2026-11-11 20:48:38.391	2026-11-12 07:32:02.659
cmwd8cfzc00gytsxkiwvav88h	cmwd8cfyr00ditsxkig9uqeve	DISK	36.9	%	\N	2026-11-11 21:19:16.689	2026-11-12 07:32:02.659
cmwd8cfzc00gztsxks86mt824	cmwd8cfyr00ditsxkig9uqeve	DISK	33.9	%	\N	2026-11-11 21:49:54.987	2026-11-12 07:32:02.659
cmwd8cfzc00h0tsxk83nc0agw	cmwd8cfyr00ditsxkig9uqeve	DISK	35.2	%	\N	2026-11-11 22:20:33.285	2026-11-12 07:32:02.659
cmwd8cfzc00h1tsxktleedjhj	cmwd8cfyr00ditsxkig9uqeve	DISK	36.4	%	\N	2026-11-11 22:51:11.583	2026-11-12 07:32:02.659
cmwd8cfzc00h2tsxkvkumyp1d	cmwd8cfyr00ditsxkig9uqeve	DISK	33.6	%	\N	2026-11-11 23:21:49.881	2026-11-12 07:32:02.659
cmwd8cfzc00h3tsxkzhywti8e	cmwd8cfyr00ditsxkig9uqeve	DISK	35.2	%	\N	2026-11-11 23:52:28.178	2026-11-12 07:32:02.659
cmwd8cfzc00h4tsxk9c8ysny5	cmwd8cfyr00ditsxkig9uqeve	DISK	32.7	%	\N	2026-11-12 00:23:06.476	2026-11-12 07:32:02.659
cmwd8cfzc00h5tsxkwjyg4byp	cmwd8cfyr00ditsxkig9uqeve	DISK	34.6	%	\N	2026-11-12 00:53:44.774	2026-11-12 07:32:02.659
cmwd8cfzc00h6tsxkbjuoiv76	cmwd8cfyr00ditsxkig9uqeve	DISK	32.5	%	\N	2026-11-12 01:24:23.072	2026-11-12 07:32:02.659
cmwd8cfzc00h7tsxk03kxay72	cmwd8cfyr00ditsxkig9uqeve	DISK	34.8	%	\N	2026-11-12 01:55:01.37	2026-11-12 07:32:02.659
cmwd8cfzc00h8tsxku4a1odo5	cmwd8cfyr00ditsxkig9uqeve	DISK	37.2	%	\N	2026-11-12 02:25:39.668	2026-11-12 07:32:02.659
cmwd8cfzc00h9tsxkm8b6cysg	cmwd8cfyr00ditsxkig9uqeve	DISK	35.4	%	\N	2026-11-12 02:56:17.966	2026-11-12 07:32:02.659
cmwd8cfzc00hatsxk51qpgyo5	cmwd8cfyr00ditsxkig9uqeve	DISK	37.8	%	\N	2026-11-12 03:26:56.264	2026-11-12 07:32:02.659
cmwd8cfzc00hbtsxk90g8kd2c	cmwd8cfyr00ditsxkig9uqeve	DISK	35.9	%	\N	2026-11-12 03:57:34.561	2026-11-12 07:32:02.659
cmwd8cfzc00hctsxk1n8hemo8	cmwd8cfyr00ditsxkig9uqeve	DISK	38.1	%	\N	2026-11-12 04:28:12.859	2026-11-12 07:32:02.659
cmwd8cfzc00hdtsxk8iutizat	cmwd8cfyr00ditsxkig9uqeve	DISK	35.9	%	\N	2026-11-12 04:58:51.157	2026-11-12 07:32:02.659
cmwd8cfzc00hetsxk6xdqot2s	cmwd8cfyr00ditsxkig9uqeve	DISK	37.7	%	\N	2026-11-12 05:29:29.455	2026-11-12 07:32:02.659
cmwd8cfzc00hftsxkkl5zsotm	cmwd8cfyr00ditsxkig9uqeve	DISK	39.3	%	\N	2026-11-12 06:00:07.753	2026-11-12 07:32:02.659
cmwd8cfzc00hgtsxke6ph08ni	cmwd8cfyr00ditsxkig9uqeve	DISK	36.5	%	\N	2026-11-12 06:30:46.051	2026-11-12 07:32:02.659
cmwd8cfzc00hhtsxk9egsxbiy	cmwd8cfyr00ditsxkig9uqeve	DISK	37.8	%	\N	2026-11-12 07:01:24.349	2026-11-12 07:32:02.659
cmwd8cfzc00hitsxkt57rrxof	cmwd8cfyr00ditsxkig9uqeve	DISK	34.9	%	\N	2026-11-12 07:32:02.647	2026-11-12 07:32:02.659
cmwd8cfzc00hjtsxkwfvj6n7z	cmwd8cfyr00ditsxkig9uqeve	NET_IN	22.6	MB/s	\N	2026-11-11 07:32:02.647	2026-11-12 07:32:02.659
cmwd8cfzc00hktsxkpc8fshr0	cmwd8cfyr00ditsxkig9uqeve	NET_IN	26.4	MB/s	\N	2026-11-11 08:02:40.944	2026-11-12 07:32:02.659
cmwd8cfzc00hltsxkczvj4mbv	cmwd8cfyr00ditsxkig9uqeve	NET_IN	29.9	MB/s	\N	2026-11-11 08:33:19.242	2026-11-12 07:32:02.659
cmwd8cfzc00hmtsxkafqcfa8x	cmwd8cfyr00ditsxkig9uqeve	NET_IN	28.8	MB/s	\N	2026-11-11 09:03:57.54	2026-11-12 07:32:02.659
cmwd8cfzc00hntsxk2xicbqmz	cmwd8cfyr00ditsxkig9uqeve	NET_IN	31.4	MB/s	\N	2026-11-11 09:34:35.838	2026-11-12 07:32:02.659
cmwd8cfzc00hotsxkujk3m9j6	cmwd8cfyr00ditsxkig9uqeve	NET_IN	29.2	MB/s	\N	2026-11-11 10:05:14.136	2026-11-12 07:32:02.659
cmwd8cfzc00hptsxks16e8gz4	cmwd8cfyr00ditsxkig9uqeve	NET_IN	30.5	MB/s	\N	2026-11-11 10:35:52.434	2026-11-12 07:32:02.659
cmwd8cfzc00hqtsxkay97ugpz	cmwd8cfyr00ditsxkig9uqeve	NET_IN	26.9	MB/s	\N	2026-11-11 11:06:30.732	2026-11-12 07:32:02.659
cmwd8cfzd00hrtsxkqaekldwv	cmwd8cfyr00ditsxkig9uqeve	NET_IN	27.1	MB/s	\N	2026-11-11 11:37:09.029	2026-11-12 07:32:02.659
cmwd8cfzd00hstsxk1eselsfd	cmwd8cfyr00ditsxkig9uqeve	NET_IN	27	MB/s	\N	2026-11-11 12:07:47.327	2026-11-12 07:32:02.659
cmwd8cfzd00httsxknsdxzbcd	cmwd8cfyr00ditsxkig9uqeve	NET_IN	22.7	MB/s	\N	2026-11-11 12:38:25.625	2026-11-12 07:32:02.659
cmwd8cfzd00hutsxkll7eq1h9	cmwd8cfyr00ditsxkig9uqeve	NET_IN	22.6	MB/s	\N	2026-11-11 13:09:03.923	2026-11-12 07:32:02.659
cmwd8cfzd00hvtsxkhvpow8jw	cmwd8cfyr00ditsxkig9uqeve	NET_IN	18.7	MB/s	\N	2026-11-11 13:39:42.221	2026-11-12 07:32:02.659
cmwd8cfzd00hwtsxkfyglvt3t	cmwd8cfyr00ditsxkig9uqeve	NET_IN	19.4	MB/s	\N	2026-11-11 14:10:20.519	2026-11-12 07:32:02.659
cmwd8cfzd00hxtsxk7swj8sp1	cmwd8cfyr00ditsxkig9uqeve	NET_IN	16.6	MB/s	\N	2026-11-11 14:40:58.817	2026-11-12 07:32:02.659
cmwd8cfzd00hytsxk5k0vogyi	cmwd8cfyr00ditsxkig9uqeve	NET_IN	18.6	MB/s	\N	2026-11-11 15:11:37.115	2026-11-12 07:32:02.659
cmwd8cfzd00hztsxkfqym1tbj	cmwd8cfyr00ditsxkig9uqeve	NET_IN	21.3	MB/s	\N	2026-11-11 15:42:15.412	2026-11-12 07:32:02.659
cmwd8cfzd00i0tsxkpfv71iac	cmwd8cfyr00ditsxkig9uqeve	NET_IN	20.3	MB/s	\N	2026-11-11 16:12:53.71	2026-11-12 07:32:02.659
cmwd8cfzd00i1tsxkc09jygb7	cmwd8cfyr00ditsxkig9uqeve	NET_IN	23.9	MB/s	\N	2026-11-11 16:43:32.008	2026-11-12 07:32:02.659
cmwd8cfzd00i2tsxkqw2x12fe	cmwd8cfyr00ditsxkig9uqeve	NET_IN	23.5	MB/s	\N	2026-11-11 17:14:10.306	2026-11-12 07:32:02.659
cmwd8cfzd00i3tsxk8dfzzjx4	cmwd8cfyr00ditsxkig9uqeve	NET_IN	27.2	MB/s	\N	2026-11-11 17:44:48.604	2026-11-12 07:32:02.659
cmwd8cfzd00i4tsxkfjj9r7v3	cmwd8cfyr00ditsxkig9uqeve	NET_IN	26.5	MB/s	\N	2026-11-11 18:15:26.902	2026-11-12 07:32:02.659
cmwd8cfzd00i5tsxksurxhqsb	cmwd8cfyr00ditsxkig9uqeve	NET_IN	29.6	MB/s	\N	2026-11-11 18:46:05.2	2026-11-12 07:32:02.659
cmwd8cfzd00i6tsxkrdlyfrcf	cmwd8cfyr00ditsxkig9uqeve	NET_IN	32.1	MB/s	\N	2026-11-11 19:16:43.498	2026-11-12 07:32:02.659
cmwd8cfzd00i7tsxkzxcx3g21	cmwd8cfyr00ditsxkig9uqeve	NET_IN	29.7	MB/s	\N	2026-11-11 19:47:21.795	2026-11-12 07:32:02.659
cmwd8cfzd00i8tsxkxy20wq9f	cmwd8cfyr00ditsxkig9uqeve	NET_IN	30.9	MB/s	\N	2026-11-11 20:18:00.093	2026-11-12 07:32:02.659
cmwd8cfzd00i9tsxkpj4jhefb	cmwd8cfyr00ditsxkig9uqeve	NET_IN	27.3	MB/s	\N	2026-11-11 20:48:38.391	2026-11-12 07:32:02.659
cmwd8cfzd00iatsxknmcd3v0o	cmwd8cfyr00ditsxkig9uqeve	NET_IN	27.5	MB/s	\N	2026-11-11 21:19:16.689	2026-11-12 07:32:02.659
cmwd8cfzd00ibtsxkqj1xi9ql	cmwd8cfyr00ditsxkig9uqeve	NET_IN	23.1	MB/s	\N	2026-11-11 21:49:54.987	2026-11-12 07:32:02.659
cmwd8cfzd00ictsxkvmkpanb7	cmwd8cfyr00ditsxkig9uqeve	NET_IN	23	MB/s	\N	2026-11-11 22:20:33.285	2026-11-12 07:32:02.659
cmwd8cfzd00idtsxkg7pmn25q	cmwd8cfyr00ditsxkig9uqeve	NET_IN	22.9	MB/s	\N	2026-11-11 22:51:11.583	2026-11-12 07:32:02.659
cmwd8cfzd00ietsxkvg0j6e8m	cmwd8cfyr00ditsxkig9uqeve	NET_IN	19.1	MB/s	\N	2026-11-11 23:21:49.881	2026-11-12 07:32:02.659
cmwd8cfzd00iftsxkfdb67c8y	cmwd8cfyr00ditsxkig9uqeve	NET_IN	19.9	MB/s	\N	2026-11-11 23:52:28.178	2026-11-12 07:32:02.659
cmwd8cfzd00igtsxkegxs7vp4	cmwd8cfyr00ditsxkig9uqeve	NET_IN	17.2	MB/s	\N	2026-11-12 00:23:06.476	2026-11-12 07:32:02.659
cmwd8cfzd00ihtsxkz4b6urhv	cmwd8cfyr00ditsxkig9uqeve	NET_IN	19.3	MB/s	\N	2026-11-12 00:53:44.774	2026-11-12 07:32:02.659
cmwd8cfzd00iitsxkfli7o02v	cmwd8cfyr00ditsxkig9uqeve	NET_IN	17.9	MB/s	\N	2026-11-12 01:24:23.072	2026-11-12 07:32:02.659
cmwd8cfzd00ijtsxkqcbicufg	cmwd8cfyr00ditsxkig9uqeve	NET_IN	21.2	MB/s	\N	2026-11-12 01:55:01.37	2026-11-12 07:32:02.659
cmwd8cfzd00iktsxkkf6iz3ln	cmwd8cfyr00ditsxkig9uqeve	NET_IN	24.8	MB/s	\N	2026-11-12 02:25:39.668	2026-11-12 07:32:02.659
cmwd8cfzd00iltsxkjlfrv1sy	cmwd8cfyr00ditsxkig9uqeve	NET_IN	24.4	MB/s	\N	2026-11-12 02:56:17.966	2026-11-12 07:32:02.659
cmwd8cfzd00imtsxk3f408q7g	cmwd8cfyr00ditsxkig9uqeve	NET_IN	28.1	MB/s	\N	2026-11-12 03:26:56.264	2026-11-12 07:32:02.659
cmwd8cfzd00intsxkoa6gatmz	cmwd8cfyr00ditsxkig9uqeve	NET_IN	27.4	MB/s	\N	2026-11-12 03:57:34.561	2026-11-12 07:32:02.659
cmwd8cfzd00iotsxk77ffmupa	cmwd8cfyr00ditsxkig9uqeve	NET_IN	30.3	MB/s	\N	2026-11-12 04:28:12.859	2026-11-12 07:32:02.659
cmwd8cfzd00iptsxkt5brvsc7	cmwd8cfyr00ditsxkig9uqeve	NET_IN	28.5	MB/s	\N	2026-11-12 04:58:51.157	2026-11-12 07:32:02.659
cmwd8cfzd00iqtsxk65n527ds	cmwd8cfyr00ditsxkig9uqeve	NET_IN	30.3	MB/s	\N	2026-11-12 05:29:29.455	2026-11-12 07:32:02.659
cmwd8cfzd00irtsxkj8u3p4b3	cmwd8cfyr00ditsxkig9uqeve	NET_IN	31.4	MB/s	\N	2026-11-12 06:00:07.753	2026-11-12 07:32:02.659
cmwd8cfzd00istsxklo52owlq	cmwd8cfyr00ditsxkig9uqeve	NET_IN	27.7	MB/s	\N	2026-11-12 06:30:46.051	2026-11-12 07:32:02.659
cmwd8cfzd00ittsxkocrvqfh4	cmwd8cfyr00ditsxkig9uqeve	NET_IN	27.8	MB/s	\N	2026-11-12 07:01:24.349	2026-11-12 07:32:02.659
cmwd8cfzd00iutsxkt6y1vd53	cmwd8cfyr00ditsxkig9uqeve	NET_IN	23.4	MB/s	\N	2026-11-12 07:32:02.647	2026-11-12 07:32:02.659
cmwd8cfzd00ivtsxk0zqpxjur	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	16.9	MB/s	\N	2026-11-11 07:32:02.647	2026-11-12 07:32:02.659
cmwd8cfzd00iwtsxkmb2vhntp	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	20.2	MB/s	\N	2026-11-11 08:02:40.944	2026-11-12 07:32:02.659
cmwd8cfzd00ixtsxkohc8gnnd	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	23.4	MB/s	\N	2026-11-11 08:33:19.242	2026-11-12 07:32:02.659
cmwd8cfze00iytsxkk4ibesez	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	22.1	MB/s	\N	2026-11-11 09:03:57.54	2026-11-12 07:32:02.659
cmwd8cfze00iztsxkthbwuujg	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	24.5	MB/s	\N	2026-11-11 09:34:35.838	2026-11-12 07:32:02.659
cmwd8cfze00j0tsxkgo5ql9fl	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	22.2	MB/s	\N	2026-11-11 10:05:14.136	2026-11-12 07:32:02.659
cmwd8cfze00j1tsxkeq9o1zfw	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	23.6	MB/s	\N	2026-11-11 10:35:52.434	2026-11-12 07:32:02.659
cmwd8cfze00j2tsxkbzwdf95s	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	20.3	MB/s	\N	2026-11-11 11:06:30.732	2026-11-12 07:32:02.659
cmwd8cfze00j3tsxk9njjknqg	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	20.9	MB/s	\N	2026-11-11 11:37:09.029	2026-11-12 07:32:02.659
cmwd8cfze00j4tsxkt41a8ia4	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	21.1	MB/s	\N	2026-11-11 12:07:47.327	2026-11-12 07:32:02.659
cmwd8cfze00j5tsxkgvjprz3s	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	17.2	MB/s	\N	2026-11-11 12:38:25.625	2026-11-12 07:32:02.659
cmwd8cfze00j6tsxk9mx1mr1r	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	17.5	MB/s	\N	2026-11-11 13:09:03.923	2026-11-12 07:32:02.659
cmwd8cfze00j7tsxk9nvxuuyb	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	13.8	MB/s	\N	2026-11-11 13:39:42.221	2026-11-12 07:32:02.659
cmwd8cfze00j8tsxkee75gdud	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	14.8	MB/s	\N	2026-11-11 14:10:20.519	2026-11-12 07:32:02.659
cmwd8cfze00j9tsxkpxp1cy56	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	12.1	MB/s	\N	2026-11-11 14:40:58.817	2026-11-12 07:32:02.659
cmwd8cfze00jatsxksror7zcz	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	14.1	MB/s	\N	2026-11-11 15:11:37.115	2026-11-12 07:32:02.659
cmwd8cfze00jbtsxkvia6hhg6	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	16.6	MB/s	\N	2026-11-11 15:42:15.412	2026-11-12 07:32:02.659
cmwd8cfze00jctsxkae3yd5n9	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	15.3	MB/s	\N	2026-11-11 16:12:53.71	2026-11-12 07:32:02.659
cmwd8cfze00jdtsxktupc3i9n	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	18.5	MB/s	\N	2026-11-11 16:43:32.008	2026-11-12 07:32:02.659
cmwd8cfze00jetsxkru3ko2zo	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	17.7	MB/s	\N	2026-11-11 17:14:10.306	2026-11-12 07:32:02.659
cmwd8cfze00jftsxkp0x4l8qd	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	21.1	MB/s	\N	2026-11-11 17:44:48.604	2026-11-12 07:32:02.659
cmwd8cfze00jgtsxkjehhicxl	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	20	MB/s	\N	2026-11-11 18:15:26.902	2026-11-12 07:32:02.659
cmwd8cfze00jhtsxkzmh7fdnf	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	22.8	MB/s	\N	2026-11-11 18:46:05.2	2026-11-12 07:32:02.659
cmwd8cfze00jitsxkh19g8iv3	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	25.2	MB/s	\N	2026-11-11 19:16:43.498	2026-11-12 07:32:02.659
cmwd8cfze00jjtsxk9hf2lxms	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	22.8	MB/s	\N	2026-11-11 19:47:21.795	2026-11-12 07:32:02.659
cmwd8cfze00jktsxk2v3tq9d4	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	24.1	MB/s	\N	2026-11-11 20:18:00.093	2026-11-12 07:32:02.659
cmwd8cfze00jltsxk780cua55	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	20.8	MB/s	\N	2026-11-11 20:48:38.391	2026-11-12 07:32:02.659
cmwd8cfze00jmtsxk0a6ybu4s	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	21.2	MB/s	\N	2026-11-11 21:19:16.689	2026-11-12 07:32:02.659
cmwd8cfze00jntsxkd1t55c1w	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	17.3	MB/s	\N	2026-11-11 21:49:54.987	2026-11-12 07:32:02.659
cmwd8cfze00jotsxkzkp6i3a1	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	17.5	MB/s	\N	2026-11-11 22:20:33.285	2026-11-12 07:32:02.659
cmwd8cfze00jptsxkitdz7hoi	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	17.9	MB/s	\N	2026-11-11 22:51:11.583	2026-11-12 07:32:02.659
cmwd8cfze00jqtsxky6u96o4l	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	14.3	MB/s	\N	2026-11-11 23:21:49.881	2026-11-12 07:32:02.659
cmwd8cfze00jrtsxksrczr2i8	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	15.3	MB/s	\N	2026-11-11 23:52:28.178	2026-11-12 07:32:02.659
cmwd8cfze00jstsxklywb8ju8	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	12.7	MB/s	\N	2026-11-12 00:23:06.476	2026-11-12 07:32:02.659
cmwd8cfze00jttsxkcaq8wyrb	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	14.7	MB/s	\N	2026-11-12 00:53:44.774	2026-11-12 07:32:02.659
cmwd8cfze00jutsxkpmrlswbo	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	13.1	MB/s	\N	2026-11-12 01:24:23.072	2026-11-12 07:32:02.659
cmwd8cfze00jvtsxk77626imu	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	16.1	MB/s	\N	2026-11-12 01:55:01.37	2026-11-12 07:32:02.659
cmwd8cfze00jwtsxkjxt05zup	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	19.4	MB/s	\N	2026-11-12 02:25:39.668	2026-11-12 07:32:02.659
cmwd8cfze00jxtsxkiljqhhwa	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	18.5	MB/s	\N	2026-11-12 02:56:17.966	2026-11-12 07:32:02.659
cmwd8cfze00jytsxk5ph2t99g	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	21.9	MB/s	\N	2026-11-12 03:26:56.264	2026-11-12 07:32:02.659
cmwd8cfze00jztsxk2t54siom	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	20.8	MB/s	\N	2026-11-12 03:57:34.561	2026-11-12 07:32:02.659
cmwd8cfze00k0tsxkbfnhekxe	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	23.5	MB/s	\N	2026-11-12 04:28:12.859	2026-11-12 07:32:02.659
cmwd8cfze00k1tsxknflbcaag	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	21.6	MB/s	\N	2026-11-12 04:58:51.157	2026-11-12 07:32:02.659
cmwd8cfze00k2tsxkl4efvv6e	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	23.4	MB/s	\N	2026-11-12 05:29:29.455	2026-11-12 07:32:02.659
cmwd8cfze00k3tsxkb5164b3m	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	24.6	MB/s	\N	2026-11-12 06:00:07.753	2026-11-12 07:32:02.659
cmwd8cfze00k4tsxkvj46x5gp	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	21.2	MB/s	\N	2026-11-12 06:30:46.051	2026-11-12 07:32:02.659
cmwd8cfzf00k5tsxkgzmqivmv	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	21.6	MB/s	\N	2026-11-12 07:01:24.349	2026-11-12 07:32:02.659
cmwd8cfzf00k6tsxkcp9xzq0y	cmwd8cfyr00ditsxkig9uqeve	NET_OUT	17.7	MB/s	\N	2026-11-12 07:32:02.647	2026-11-12 07:32:02.659
cmwd8cg2o00k8tsxko39ci06y	cmwd8cg1y00k7tsxky2xplb37	CPU	92.2	%	\N	2026-11-11 07:32:02.764	2026-11-12 07:32:02.783
cmwd8cg2o00k9tsxke9nw0nz1	cmwd8cg1y00k7tsxky2xplb37	CPU	95.8	%	\N	2026-11-11 08:02:41.061	2026-11-12 07:32:02.783
cmwd8cg2o00katsxk5fu7usvx	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-11 08:33:19.359	2026-11-12 07:32:02.783
cmwd8cg2o00kbtsxkzuv5mv7j	cmwd8cg1y00k7tsxky2xplb37	CPU	98.2	%	\N	2026-11-11 09:03:57.657	2026-11-12 07:32:02.783
cmwd8cg2o00kctsxk25582vsb	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-11 09:34:35.955	2026-11-12 07:32:02.783
cmwd8cg2o00kdtsxknwaw26m7	cmwd8cg1y00k7tsxky2xplb37	CPU	98.8	%	\N	2026-11-11 10:05:14.253	2026-11-12 07:32:02.783
cmwd8cg2o00ketsxkjo7mx3hx	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-11 10:35:52.551	2026-11-12 07:32:02.783
cmwd8cg2o00kftsxki478fq87	cmwd8cg1y00k7tsxky2xplb37	CPU	97.4	%	\N	2026-11-11 11:06:30.849	2026-11-12 07:32:02.783
cmwd8cg2o00kgtsxk8my3raky	cmwd8cg1y00k7tsxky2xplb37	CPU	98.2	%	\N	2026-11-11 11:37:09.146	2026-11-12 07:32:02.783
cmwd8cg2o00khtsxkelg5c89r	cmwd8cg1y00k7tsxky2xplb37	CPU	98.7	%	\N	2026-11-11 12:07:47.444	2026-11-12 07:32:02.783
cmwd8cg2o00kitsxkiqq8u1mt	cmwd8cg1y00k7tsxky2xplb37	CPU	95	%	\N	2026-11-11 12:38:25.742	2026-11-12 07:32:02.783
cmwd8cg2o00kjtsxke3x4v8qg	cmwd8cg1y00k7tsxky2xplb37	CPU	95.5	%	\N	2026-11-11 13:09:04.04	2026-11-12 07:32:02.783
cmwd8cg2o00kktsxkqauh03ns	cmwd8cg1y00k7tsxky2xplb37	CPU	92.2	%	\N	2026-11-11 13:39:42.338	2026-11-12 07:32:02.783
cmwd8cg2o00kltsxklybbwjoi	cmwd8cg1y00k7tsxky2xplb37	CPU	93.4	%	\N	2026-11-11 14:10:20.636	2026-11-12 07:32:02.783
cmwd8cg2o00kmtsxkmbqmoik3	cmwd8cg1y00k7tsxky2xplb37	CPU	90.9	%	\N	2026-11-11 14:40:58.934	2026-11-12 07:32:02.783
cmwd8cg2o00kntsxkgzm3p5gv	cmwd8cg1y00k7tsxky2xplb37	CPU	93.1	%	\N	2026-11-11 15:11:37.232	2026-11-12 07:32:02.783
cmwd8cg2o00kotsxkuqcxp35m	cmwd8cg1y00k7tsxky2xplb37	CPU	95.9	%	\N	2026-11-11 15:42:15.529	2026-11-12 07:32:02.783
cmwd8cg2o00kptsxkimwx60a8	cmwd8cg1y00k7tsxky2xplb37	CPU	94.9	%	\N	2026-11-11 16:12:53.827	2026-11-12 07:32:02.783
cmwd8cg2p00kqtsxk5f2896kx	cmwd8cg1y00k7tsxky2xplb37	CPU	98.4	%	\N	2026-11-11 16:43:32.125	2026-11-12 07:32:02.783
cmwd8cg2p00krtsxknb1oo8rk	cmwd8cg1y00k7tsxky2xplb37	CPU	97.8	%	\N	2026-11-11 17:14:10.423	2026-11-12 07:32:02.783
cmwd8cg2p00kstsxk2bwrbpee	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-11 17:44:48.721	2026-11-12 07:32:02.783
cmwd8cg2p00kttsxkyzdyds96	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-11 18:15:27.019	2026-11-12 07:32:02.783
cmwd8cg2p00kutsxkzwdp90rm	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-11 18:46:05.317	2026-11-12 07:32:02.783
cmwd8cg2p00kvtsxkp3zbeexz	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-11 19:16:43.615	2026-11-12 07:32:02.783
cmwd8cg2p00kwtsxkedoc73mf	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-11 19:47:21.912	2026-11-12 07:32:02.783
cmwd8cg2p00kxtsxkxurz9e0g	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-11 20:18:00.21	2026-11-12 07:32:02.783
cmwd8cg2p00kytsxka4to5xgs	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-11 20:48:38.508	2026-11-12 07:32:02.783
cmwd8cg2p00kztsxkdwb7gzv4	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-11 21:19:16.806	2026-11-12 07:32:02.783
cmwd8cg2p00l0tsxk5r4fr3cz	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-11 21:49:55.104	2026-11-12 07:32:02.783
cmwd8cg2p00l1tsxkvift3trf	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-11 22:20:33.402	2026-11-12 07:32:02.783
cmwd8cg2p00l2tsxk2h7fvnvn	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-11 22:51:11.7	2026-11-12 07:32:02.783
cmwd8cg2p00l3tsxkizwkyxio	cmwd8cg1y00k7tsxky2xplb37	CPU	97.4	%	\N	2026-11-11 23:21:49.998	2026-11-12 07:32:02.783
cmwd8cg2p00l4tsxk4qcrnzvr	cmwd8cg1y00k7tsxky2xplb37	CPU	98.7	%	\N	2026-11-11 23:52:28.295	2026-11-12 07:32:02.783
cmwd8cg2p00l5tsxkf8i13l0h	cmwd8cg1y00k7tsxky2xplb37	CPU	96.3	%	\N	2026-11-12 00:23:06.593	2026-11-12 07:32:02.783
cmwd8cg2p00l6tsxki97s8bgd	cmwd8cg1y00k7tsxky2xplb37	CPU	98.6	%	\N	2026-11-12 00:53:44.891	2026-11-12 07:32:02.783
cmwd8cg2p00l7tsxk7nwvc3hn	cmwd8cg1y00k7tsxky2xplb37	CPU	97.2	%	\N	2026-11-12 01:24:23.189	2026-11-12 07:32:02.783
cmwd8cg2p00l8tsxkk9m6n504	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-12 01:55:01.487	2026-11-12 07:32:02.783
cmwd8cg2p00l9tsxk35vedfs3	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-12 02:25:39.785	2026-11-12 07:32:02.783
cmwd8cg2p00latsxkn9b1hsgk	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-12 02:56:18.083	2026-11-12 07:32:02.783
cmwd8cg2p00lbtsxk6ipfo49w	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-12 03:26:56.381	2026-11-12 07:32:02.783
cmwd8cg2p00lctsxkihezk5da	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-12 03:57:34.678	2026-11-12 07:32:02.783
cmwd8cg2p00ldtsxk7v99absh	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-12 04:28:12.976	2026-11-12 07:32:02.783
cmwd8cg2p00letsxkxwq2tp9p	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-12 04:58:51.274	2026-11-12 07:32:02.783
cmwd8cg2p00lftsxkg4zy4xu9	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-12 05:29:29.572	2026-11-12 07:32:02.783
cmwd8cg2p00lgtsxk72g89l6z	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-12 06:00:07.87	2026-11-12 07:32:02.783
cmwd8cg2p00lhtsxkr77b4bnh	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-12 06:30:46.168	2026-11-12 07:32:02.783
cmwd8cg2p00litsxkze3g13wo	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-12 07:01:24.466	2026-11-12 07:32:02.783
cmwd8cg2p00ljtsxktzz2ly4r	cmwd8cg1y00k7tsxky2xplb37	CPU	99	%	\N	2026-11-12 07:32:02.764	2026-11-12 07:32:02.783
cmwd8cg2p00lktsxkjw1ck8y4	cmwd8cg1y00k7tsxky2xplb37	MEM	89.2	%	\N	2026-11-11 07:32:02.765	2026-11-12 07:32:02.783
cmwd8cg2q00lltsxkxp8dde0u	cmwd8cg1y00k7tsxky2xplb37	MEM	92.2	%	\N	2026-11-11 08:02:41.062	2026-11-12 07:32:02.783
cmwd8cg2q00lmtsxklmman3p2	cmwd8cg1y00k7tsxky2xplb37	MEM	95.1	%	\N	2026-11-11 08:33:19.36	2026-11-12 07:32:02.783
cmwd8cg2q00lntsxkwl1dq147	cmwd8cg1y00k7tsxky2xplb37	MEM	93.5	%	\N	2026-11-11 09:03:57.658	2026-11-12 07:32:02.783
cmwd8cg2q00lotsxk5rgh7bfl	cmwd8cg1y00k7tsxky2xplb37	MEM	95.8	%	\N	2026-11-11 09:34:35.956	2026-11-12 07:32:02.783
cmwd8cg2q00lptsxkioxe6cd4	cmwd8cg1y00k7tsxky2xplb37	MEM	93.5	%	\N	2026-11-11 10:05:14.254	2026-11-12 07:32:02.783
cmwd8cg2q00lqtsxkbctvfy21	cmwd8cg1y00k7tsxky2xplb37	MEM	95	%	\N	2026-11-11 10:35:52.552	2026-11-12 07:32:02.783
cmwd8cg2q00lrtsxkls24bmvf	cmwd8cg1y00k7tsxky2xplb37	MEM	91.9	%	\N	2026-11-11 11:06:30.85	2026-11-12 07:32:02.783
cmwd8cg2q00lstsxkkdjjj1dj	cmwd8cg1y00k7tsxky2xplb37	MEM	92.8	%	\N	2026-11-11 11:37:09.147	2026-11-12 07:32:02.783
cmwd8cg2q00lttsxktoemrasr	cmwd8cg1y00k7tsxky2xplb37	MEM	93.5	%	\N	2026-11-11 12:07:47.445	2026-11-12 07:32:02.783
cmwd8cg2q00lutsxkdvgvxkq1	cmwd8cg1y00k7tsxky2xplb37	MEM	89.9	%	\N	2026-11-11 12:38:25.743	2026-11-12 07:32:02.783
cmwd8cg2q00lvtsxkna18csux	cmwd8cg1y00k7tsxky2xplb37	MEM	90.6	%	\N	2026-11-11 13:09:04.041	2026-11-12 07:32:02.783
cmwd8cg2q00lwtsxkamuqfr3g	cmwd8cg1y00k7tsxky2xplb37	MEM	87.3	%	\N	2026-11-11 13:39:42.339	2026-11-12 07:32:02.783
cmwd8cg2q00lxtsxkobolh9uj	cmwd8cg1y00k7tsxky2xplb37	MEM	88.5	%	\N	2026-11-11 14:10:20.637	2026-11-12 07:32:02.783
cmwd8cg2q00lytsxk1dorq9bp	cmwd8cg1y00k7tsxky2xplb37	MEM	85.9	%	\N	2026-11-11 14:40:58.935	2026-11-12 07:32:02.783
cmwd8cg2q00lztsxkm8terhgi	cmwd8cg1y00k7tsxky2xplb37	MEM	87.9	%	\N	2026-11-11 15:11:37.233	2026-11-12 07:32:02.783
cmwd8cg2q00m0tsxk0dtjlec5	cmwd8cg1y00k7tsxky2xplb37	MEM	90.2	%	\N	2026-11-11 15:42:15.53	2026-11-12 07:32:02.783
cmwd8cg2q00m1tsxkcqvwbck0	cmwd8cg1y00k7tsxky2xplb37	MEM	88.7	%	\N	2026-11-11 16:12:53.828	2026-11-12 07:32:02.783
cmwd8cg2q00m2tsxkbpo6ydkc	cmwd8cg1y00k7tsxky2xplb37	MEM	91.6	%	\N	2026-11-11 16:43:32.126	2026-11-12 07:32:02.783
cmwd8cg2q00m3tsxkbgumlbr7	cmwd8cg1y00k7tsxky2xplb37	MEM	90.4	%	\N	2026-11-11 17:14:10.424	2026-11-12 07:32:02.783
cmwd8cg2q00m4tsxkqduke0r0	cmwd8cg1y00k7tsxky2xplb37	MEM	93.4	%	\N	2026-11-11 17:44:48.722	2026-11-12 07:32:02.783
cmwd8cg2q00m5tsxkmyhah264	cmwd8cg1y00k7tsxky2xplb37	MEM	92	%	\N	2026-11-11 18:15:27.02	2026-11-12 07:32:02.783
cmwd8cg2q00m6tsxkuyu8odg5	cmwd8cg1y00k7tsxky2xplb37	MEM	94.6	%	\N	2026-11-11 18:46:05.318	2026-11-12 07:32:02.783
cmwd8cg2q00m7tsxkll5q7jhf	cmwd8cg1y00k7tsxky2xplb37	MEM	96.8	%	\N	2026-11-11 19:16:43.616	2026-11-12 07:32:02.783
cmwd8cg2q00m8tsxk5e642dtf	cmwd8cg1y00k7tsxky2xplb37	MEM	94.5	%	\N	2026-11-11 19:47:21.913	2026-11-12 07:32:02.783
cmwd8cg2q00m9tsxkfrj4vnor	cmwd8cg1y00k7tsxky2xplb37	MEM	95.9	%	\N	2026-11-11 20:18:00.211	2026-11-12 07:32:02.783
cmwd8cg2q00matsxkyo0ctsut	cmwd8cg1y00k7tsxky2xplb37	MEM	92.8	%	\N	2026-11-11 20:48:38.509	2026-11-12 07:32:02.783
cmwd8cg2q00mbtsxk8czpel84	cmwd8cg1y00k7tsxky2xplb37	MEM	93.6	%	\N	2026-11-11 21:19:16.807	2026-11-12 07:32:02.783
cmwd8cg2q00mctsxkbsvsg63p	cmwd8cg1y00k7tsxky2xplb37	MEM	90.1	%	\N	2026-11-11 21:49:55.105	2026-11-12 07:32:02.783
cmwd8cg2q00mdtsxkab5nk0xo	cmwd8cg1y00k7tsxky2xplb37	MEM	90.7	%	\N	2026-11-11 22:20:33.403	2026-11-12 07:32:02.783
cmwd8cg2q00metsxkthbgl5gx	cmwd8cg1y00k7tsxky2xplb37	MEM	91.5	%	\N	2026-11-11 22:51:11.701	2026-11-12 07:32:02.783
cmwd8cg2q00mftsxk1iq5xdsq	cmwd8cg1y00k7tsxky2xplb37	MEM	88.2	%	\N	2026-11-11 23:21:49.999	2026-11-12 07:32:02.783
cmwd8cg2q00mgtsxklhmntgqw	cmwd8cg1y00k7tsxky2xplb37	MEM	89.5	%	\N	2026-11-11 23:52:28.296	2026-11-12 07:32:02.783
cmwd8cg2q00mhtsxk8jrb1qn1	cmwd8cg1y00k7tsxky2xplb37	MEM	86.9	%	\N	2026-11-12 00:23:06.594	2026-11-12 07:32:02.783
cmwd8cg2q00mitsxkdw1h9ia8	cmwd8cg1y00k7tsxky2xplb37	MEM	88.9	%	\N	2026-11-12 00:53:44.892	2026-11-12 07:32:02.783
cmwd8cg2r00mjtsxkph4cconx	cmwd8cg1y00k7tsxky2xplb37	MEM	87.1	%	\N	2026-11-12 01:24:23.19	2026-11-12 07:32:02.783
cmwd8cg2r00mktsxk2k6qgzqz	cmwd8cg1y00k7tsxky2xplb37	MEM	89.8	%	\N	2026-11-12 01:55:01.488	2026-11-12 07:32:02.783
cmwd8cg2r00mltsxkdtx4sce2	cmwd8cg1y00k7tsxky2xplb37	MEM	92.7	%	\N	2026-11-12 02:25:39.786	2026-11-12 07:32:02.783
cmwd8cg2r00mmtsxke7c8rr5f	cmwd8cg1y00k7tsxky2xplb37	MEM	91.6	%	\N	2026-11-12 02:56:18.084	2026-11-12 07:32:02.783
cmwd8cg2r00mntsxkvcpezxci	cmwd8cg1y00k7tsxky2xplb37	MEM	94.5	%	\N	2026-11-12 03:26:56.382	2026-11-12 07:32:02.783
cmwd8cg2r00motsxk8nsc04uy	cmwd8cg1y00k7tsxky2xplb37	MEM	93.1	%	\N	2026-11-12 03:57:34.679	2026-11-12 07:32:02.783
cmwd8cg2r00mptsxkgbm7ha88	cmwd8cg1y00k7tsxky2xplb37	MEM	95.7	%	\N	2026-11-12 04:28:12.977	2026-11-12 07:32:02.783
cmwd8cg2r00mqtsxk6cuvigpu	cmwd8cg1y00k7tsxky2xplb37	MEM	93.6	%	\N	2026-11-12 04:58:51.275	2026-11-12 07:32:02.783
cmwd8cg2r00mrtsxkt59j0j01	cmwd8cg1y00k7tsxky2xplb37	MEM	95.4	%	\N	2026-11-12 05:29:29.573	2026-11-12 07:32:02.783
cmwd8cg2r00mstsxk6kss2m51	cmwd8cg1y00k7tsxky2xplb37	MEM	96.8	%	\N	2026-11-12 06:00:07.871	2026-11-12 07:32:02.783
cmwd8cg2r00mttsxk9zk30y6d	cmwd8cg1y00k7tsxky2xplb37	MEM	93.7	%	\N	2026-11-12 06:30:46.169	2026-11-12 07:32:02.783
cmwd8cg2r00mutsxkq80ax4a6	cmwd8cg1y00k7tsxky2xplb37	MEM	94.5	%	\N	2026-11-12 07:01:24.467	2026-11-12 07:32:02.783
cmwd8cg2r00mvtsxk7kkval3x	cmwd8cg1y00k7tsxky2xplb37	MEM	90.9	%	\N	2026-11-12 07:32:02.765	2026-11-12 07:32:02.783
cmwd8cg2r00mwtsxk7vidqdmg	cmwd8cg1y00k7tsxky2xplb37	DISK	65.2	%	\N	2026-11-11 07:32:02.766	2026-11-12 07:32:02.783
cmwd8cg2r00mxtsxk33ijbhgj	cmwd8cg1y00k7tsxky2xplb37	DISK	67.6	%	\N	2026-11-11 08:02:41.063	2026-11-12 07:32:02.783
cmwd8cg2r00mytsxkrq96eanl	cmwd8cg1y00k7tsxky2xplb37	DISK	70	%	\N	2026-11-11 08:33:19.361	2026-11-12 07:32:02.783
cmwd8cg2r00mztsxkm3fq1pwu	cmwd8cg1y00k7tsxky2xplb37	DISK	68	%	\N	2026-11-11 09:03:57.659	2026-11-12 07:32:02.783
cmwd8cg2r00n0tsxk91g3as0o	cmwd8cg1y00k7tsxky2xplb37	DISK	70	%	\N	2026-11-11 09:34:35.957	2026-11-12 07:32:02.783
cmwd8cg2r00n1tsxkvoga1r8k	cmwd8cg1y00k7tsxky2xplb37	DISK	67.7	%	\N	2026-11-11 10:05:14.255	2026-11-12 07:32:02.783
cmwd8cg2r00n2tsxk0yz5lvzc	cmwd8cg1y00k7tsxky2xplb37	DISK	69.4	%	\N	2026-11-11 10:35:52.553	2026-11-12 07:32:02.783
cmwd8cg2r00n3tsxk40aiyvfy	cmwd8cg1y00k7tsxky2xplb37	DISK	66.6	%	\N	2026-11-11 11:06:30.851	2026-11-12 07:32:02.783
cmwd8cg2r00n4tsxkuogf84qu	cmwd8cg1y00k7tsxky2xplb37	DISK	68	%	\N	2026-11-11 11:37:09.148	2026-11-12 07:32:02.783
cmwd8cg2r00n5tsxk4rbls4ej	cmwd8cg1y00k7tsxky2xplb37	DISK	69.2	%	\N	2026-11-11 12:07:47.446	2026-11-12 07:32:02.783
cmwd8cg2r00n6tsxk1b1tujw6	cmwd8cg1y00k7tsxky2xplb37	DISK	66.3	%	\N	2026-11-11 12:38:25.744	2026-11-12 07:32:02.783
cmwd8cg2r00n7tsxkugpfwogg	cmwd8cg1y00k7tsxky2xplb37	DISK	67.5	%	\N	2026-11-11 13:09:04.042	2026-11-12 07:32:02.783
cmwd8cg2r00n8tsxkjck4cg8l	cmwd8cg1y00k7tsxky2xplb37	DISK	64.7	%	\N	2026-11-11 13:39:42.34	2026-11-12 07:32:02.783
cmwd8cg2r00n9tsxknh4bubiu	cmwd8cg1y00k7tsxky2xplb37	DISK	66.2	%	\N	2026-11-11 14:10:20.638	2026-11-12 07:32:02.783
cmwd8cg2r00natsxk2l5pke4j	cmwd8cg1y00k7tsxky2xplb37	DISK	63.7	%	\N	2026-11-11 14:40:58.936	2026-11-12 07:32:02.783
cmwd8cg2r00nbtsxkdpi38qge	cmwd8cg1y00k7tsxky2xplb37	DISK	65.6	%	\N	2026-11-11 15:11:37.234	2026-11-12 07:32:02.783
cmwd8cg2r00nctsxk2vve7ic6	cmwd8cg1y00k7tsxky2xplb37	DISK	67.7	%	\N	2026-11-11 15:42:15.531	2026-11-12 07:32:02.783
cmwd8cg2r00ndtsxkwnc1uoz7	cmwd8cg1y00k7tsxky2xplb37	DISK	65.7	%	\N	2026-11-11 16:12:53.829	2026-11-12 07:32:02.783
cmwd8cg2r00netsxkuroe251r	cmwd8cg1y00k7tsxky2xplb37	DISK	68.1	%	\N	2026-11-11 16:43:32.127	2026-11-12 07:32:02.783
cmwd8cg2r00nftsxknnuf05lk	cmwd8cg1y00k7tsxky2xplb37	DISK	66.3	%	\N	2026-11-11 17:14:10.425	2026-11-12 07:32:02.783
cmwd8cg2r00ngtsxkhcbqpgat	cmwd8cg1y00k7tsxky2xplb37	DISK	68.7	%	\N	2026-11-11 17:44:48.723	2026-11-12 07:32:02.783
cmwd8cg2r00nhtsxki25erzwa	cmwd8cg1y00k7tsxky2xplb37	DISK	66.8	%	\N	2026-11-11 18:15:27.021	2026-11-12 07:32:02.783
cmwd8cg2r00nitsxkzvo4vjbr	cmwd8cg1y00k7tsxky2xplb37	DISK	69	%	\N	2026-11-11 18:46:05.319	2026-11-12 07:32:02.783
cmwd8cg2r00njtsxk0nm9ounh	cmwd8cg1y00k7tsxky2xplb37	DISK	71	%	\N	2026-11-11 19:16:43.617	2026-11-12 07:32:02.783
cmwd8cg2r00nktsxkyz5e0dcb	cmwd8cg1y00k7tsxky2xplb37	DISK	68.7	%	\N	2026-11-11 19:47:21.914	2026-11-12 07:32:02.783
cmwd8cg2r00nltsxkox1t5da9	cmwd8cg1y00k7tsxky2xplb37	DISK	70.3	%	\N	2026-11-11 20:18:00.212	2026-11-12 07:32:02.783
cmwd8cg2s00nmtsxk2qhb69pb	cmwd8cg1y00k7tsxky2xplb37	DISK	67.6	%	\N	2026-11-11 20:48:38.51	2026-11-12 07:32:02.783
cmwd8cg2s00nntsxkukmxf9hr	cmwd8cg1y00k7tsxky2xplb37	DISK	68.9	%	\N	2026-11-11 21:19:16.808	2026-11-12 07:32:02.783
cmwd8cg2s00notsxkm193msbu	cmwd8cg1y00k7tsxky2xplb37	DISK	65.9	%	\N	2026-11-11 21:49:55.106	2026-11-12 07:32:02.783
cmwd8cg2s00nptsxk8wjya8ow	cmwd8cg1y00k7tsxky2xplb37	DISK	67.2	%	\N	2026-11-11 22:20:33.404	2026-11-12 07:32:02.783
cmwd8cg2s00nqtsxktp6n1ywf	cmwd8cg1y00k7tsxky2xplb37	DISK	68.4	%	\N	2026-11-11 22:51:11.702	2026-11-12 07:32:02.783
cmwd8cg2s00nrtsxkr49yzh33	cmwd8cg1y00k7tsxky2xplb37	DISK	65.6	%	\N	2026-11-11 23:21:50	2026-11-12 07:32:02.783
cmwd8cg2s00nstsxkgd4qkoer	cmwd8cg1y00k7tsxky2xplb37	DISK	67.2	%	\N	2026-11-11 23:52:28.297	2026-11-12 07:32:02.783
cmwd8cg2s00nttsxkuxslxscu	cmwd8cg1y00k7tsxky2xplb37	DISK	64.7	%	\N	2026-11-12 00:23:06.595	2026-11-12 07:32:02.783
cmwd8cg2s00nutsxkiebzsv5z	cmwd8cg1y00k7tsxky2xplb37	DISK	66.6	%	\N	2026-11-12 00:53:44.893	2026-11-12 07:32:02.783
cmwd8cg2s00nvtsxkvclhws1z	cmwd8cg1y00k7tsxky2xplb37	DISK	64.5	%	\N	2026-11-12 01:24:23.191	2026-11-12 07:32:02.783
cmwd8cg2s00nwtsxkj1hbeoge	cmwd8cg1y00k7tsxky2xplb37	DISK	66.8	%	\N	2026-11-12 01:55:01.489	2026-11-12 07:32:02.783
cmwd8cg2s00nxtsxk0b7323ao	cmwd8cg1y00k7tsxky2xplb37	DISK	69.2	%	\N	2026-11-12 02:25:39.787	2026-11-12 07:32:02.783
cmwd8cg2s00nytsxk0p356kbk	cmwd8cg1y00k7tsxky2xplb37	DISK	67.4	%	\N	2026-11-12 02:56:18.085	2026-11-12 07:32:02.783
cmwd8cg2s00nztsxkuohyod9x	cmwd8cg1y00k7tsxky2xplb37	DISK	69.8	%	\N	2026-11-12 03:26:56.383	2026-11-12 07:32:02.783
cmwd8cg2s00o0tsxkm2c1o6bz	cmwd8cg1y00k7tsxky2xplb37	DISK	67.9	%	\N	2026-11-12 03:57:34.68	2026-11-12 07:32:02.783
cmwd8cg2s00o1tsxkba971h36	cmwd8cg1y00k7tsxky2xplb37	DISK	70.1	%	\N	2026-11-12 04:28:12.978	2026-11-12 07:32:02.783
cmwd8cg2s00o2tsxkmrg061mf	cmwd8cg1y00k7tsxky2xplb37	DISK	67.9	%	\N	2026-11-12 04:58:51.276	2026-11-12 07:32:02.783
cmwd8cg2s00o3tsxkxg5ac8ji	cmwd8cg1y00k7tsxky2xplb37	DISK	69.7	%	\N	2026-11-12 05:29:29.574	2026-11-12 07:32:02.783
cmwd8cg2s00o4tsxksj8gzu1d	cmwd8cg1y00k7tsxky2xplb37	DISK	71.3	%	\N	2026-11-12 06:00:07.872	2026-11-12 07:32:02.783
cmwd8cg2s00o5tsxk9e79zre9	cmwd8cg1y00k7tsxky2xplb37	DISK	68.5	%	\N	2026-11-12 06:30:46.17	2026-11-12 07:32:02.783
cmwd8cg2s00o6tsxknyy39mz2	cmwd8cg1y00k7tsxky2xplb37	DISK	69.8	%	\N	2026-11-12 07:01:24.468	2026-11-12 07:32:02.783
cmwd8cg2s00o7tsxkmvt76ifk	cmwd8cg1y00k7tsxky2xplb37	DISK	66.9	%	\N	2026-11-12 07:32:02.766	2026-11-12 07:32:02.783
cmwd8cg2s00o8tsxkpzlx9rsu	cmwd8cg1y00k7tsxky2xplb37	NET_IN	37	MB/s	\N	2026-11-11 07:32:02.767	2026-11-12 07:32:02.783
cmwd8cg2s00o9tsxk5mft7w97	cmwd8cg1y00k7tsxky2xplb37	NET_IN	40.8	MB/s	\N	2026-11-11 08:02:41.064	2026-11-12 07:32:02.783
cmwd8cg2s00oatsxkilpf0egl	cmwd8cg1y00k7tsxky2xplb37	NET_IN	44.3	MB/s	\N	2026-11-11 08:33:19.362	2026-11-12 07:32:02.783
cmwd8cg2s00obtsxkzw4f0u28	cmwd8cg1y00k7tsxky2xplb37	NET_IN	43.2	MB/s	\N	2026-11-11 09:03:57.66	2026-11-12 07:32:02.783
cmwd8cg2s00octsxkr565n3jo	cmwd8cg1y00k7tsxky2xplb37	NET_IN	45.8	MB/s	\N	2026-11-11 09:34:35.958	2026-11-12 07:32:02.783
cmwd8cg2s00odtsxkebd330uh	cmwd8cg1y00k7tsxky2xplb37	NET_IN	43.6	MB/s	\N	2026-11-11 10:05:14.256	2026-11-12 07:32:02.783
cmwd8cg2s00oetsxkxoj6izuv	cmwd8cg1y00k7tsxky2xplb37	NET_IN	44.9	MB/s	\N	2026-11-11 10:35:52.554	2026-11-12 07:32:02.783
cmwd8cg2s00oftsxkofs59i0r	cmwd8cg1y00k7tsxky2xplb37	NET_IN	41.3	MB/s	\N	2026-11-11 11:06:30.852	2026-11-12 07:32:02.783
cmwd8cg2s00ogtsxku77qakkp	cmwd8cg1y00k7tsxky2xplb37	NET_IN	41.5	MB/s	\N	2026-11-11 11:37:09.149	2026-11-12 07:32:02.783
cmwd8cg2s00ohtsxkqynwlwx3	cmwd8cg1y00k7tsxky2xplb37	NET_IN	41.4	MB/s	\N	2026-11-11 12:07:47.447	2026-11-12 07:32:02.783
cmwd8cg2s00oitsxk7tnxs2nd	cmwd8cg1y00k7tsxky2xplb37	NET_IN	37.1	MB/s	\N	2026-11-11 12:38:25.745	2026-11-12 07:32:02.783
cmwd8cg2s00ojtsxkpoxf09my	cmwd8cg1y00k7tsxky2xplb37	NET_IN	37	MB/s	\N	2026-11-11 13:09:04.043	2026-11-12 07:32:02.783
cmwd8cg2s00oktsxk0rflrt1i	cmwd8cg1y00k7tsxky2xplb37	NET_IN	33.1	MB/s	\N	2026-11-11 13:39:42.341	2026-11-12 07:32:02.783
cmwd8cg2s00oltsxkhc4y3ihg	cmwd8cg1y00k7tsxky2xplb37	NET_IN	33.8	MB/s	\N	2026-11-11 14:10:20.639	2026-11-12 07:32:02.783
cmwd8cg2s00omtsxklpxrub57	cmwd8cg1y00k7tsxky2xplb37	NET_IN	31	MB/s	\N	2026-11-11 14:40:58.937	2026-11-12 07:32:02.783
cmwd8cg2s00ontsxk9iw8o5ju	cmwd8cg1y00k7tsxky2xplb37	NET_IN	33	MB/s	\N	2026-11-11 15:11:37.235	2026-11-12 07:32:02.783
cmwd8cg2t00ootsxknsx5xyhc	cmwd8cg1y00k7tsxky2xplb37	NET_IN	35.7	MB/s	\N	2026-11-11 15:42:15.532	2026-11-12 07:32:02.783
cmwd8cg2t00optsxkgfniqpo9	cmwd8cg1y00k7tsxky2xplb37	NET_IN	34.7	MB/s	\N	2026-11-11 16:12:53.83	2026-11-12 07:32:02.783
cmwd8cg2t00oqtsxkjzbaf9w3	cmwd8cg1y00k7tsxky2xplb37	NET_IN	38.3	MB/s	\N	2026-11-11 16:43:32.128	2026-11-12 07:32:02.783
cmwd8cg2t00ortsxk7zmfocwc	cmwd8cg1y00k7tsxky2xplb37	NET_IN	37.9	MB/s	\N	2026-11-11 17:14:10.426	2026-11-12 07:32:02.783
cmwd8cg2t00ostsxk4zg4dgi4	cmwd8cg1y00k7tsxky2xplb37	NET_IN	41.6	MB/s	\N	2026-11-11 17:44:48.724	2026-11-12 07:32:02.783
cmwd8cg2t00ottsxkki6w9a2i	cmwd8cg1y00k7tsxky2xplb37	NET_IN	40.9	MB/s	\N	2026-11-11 18:15:27.022	2026-11-12 07:32:02.783
cmwd8cg2t00outsxkvmk0rkpu	cmwd8cg1y00k7tsxky2xplb37	NET_IN	44	MB/s	\N	2026-11-11 18:46:05.32	2026-11-12 07:32:02.783
cmwd8cg2t00ovtsxkyee4fdfd	cmwd8cg1y00k7tsxky2xplb37	NET_IN	46.5	MB/s	\N	2026-11-11 19:16:43.618	2026-11-12 07:32:02.783
cmwd8cg2t00owtsxk5nwy0fqp	cmwd8cg1y00k7tsxky2xplb37	NET_IN	44.1	MB/s	\N	2026-11-11 19:47:21.915	2026-11-12 07:32:02.783
cmwd8cg2t00oxtsxkk480cjjh	cmwd8cg1y00k7tsxky2xplb37	NET_IN	45.3	MB/s	\N	2026-11-11 20:18:00.213	2026-11-12 07:32:02.783
cmwd8cg2t00oytsxkf6s26reh	cmwd8cg1y00k7tsxky2xplb37	NET_IN	41.7	MB/s	\N	2026-11-11 20:48:38.511	2026-11-12 07:32:02.783
cmwd8cg2t00oztsxkvopxbuby	cmwd8cg1y00k7tsxky2xplb37	NET_IN	41.9	MB/s	\N	2026-11-11 21:19:16.809	2026-11-12 07:32:02.783
cmwd8cg2t00p0tsxkv80j335o	cmwd8cg1y00k7tsxky2xplb37	NET_IN	37.5	MB/s	\N	2026-11-11 21:49:55.107	2026-11-12 07:32:02.783
cmwd8cg2t00p1tsxkehnyhowy	cmwd8cg1y00k7tsxky2xplb37	NET_IN	37.4	MB/s	\N	2026-11-11 22:20:33.405	2026-11-12 07:32:02.783
cmwd8cg2t00p2tsxky99men1g	cmwd8cg1y00k7tsxky2xplb37	NET_IN	37.3	MB/s	\N	2026-11-11 22:51:11.703	2026-11-12 07:32:02.783
cmwd8cg2t00p3tsxkevdahs5p	cmwd8cg1y00k7tsxky2xplb37	NET_IN	33.5	MB/s	\N	2026-11-11 23:21:50.001	2026-11-12 07:32:02.783
cmwd8cg2t00p4tsxkgdi7tma7	cmwd8cg1y00k7tsxky2xplb37	NET_IN	34.3	MB/s	\N	2026-11-11 23:52:28.298	2026-11-12 07:32:02.783
cmwd8cg2t00p5tsxkq8hwn49h	cmwd8cg1y00k7tsxky2xplb37	NET_IN	31.6	MB/s	\N	2026-11-12 00:23:06.596	2026-11-12 07:32:02.783
cmwd8cg2t00p6tsxkbdysg3ax	cmwd8cg1y00k7tsxky2xplb37	NET_IN	33.7	MB/s	\N	2026-11-12 00:53:44.894	2026-11-12 07:32:02.783
cmwd8cg2t00p7tsxk95frjvz4	cmwd8cg1y00k7tsxky2xplb37	NET_IN	32.3	MB/s	\N	2026-11-12 01:24:23.192	2026-11-12 07:32:02.783
cmwd8cg2t00p8tsxkjs1qjvv6	cmwd8cg1y00k7tsxky2xplb37	NET_IN	35.6	MB/s	\N	2026-11-12 01:55:01.49	2026-11-12 07:32:02.783
cmwd8cg2t00p9tsxkqow8vy4s	cmwd8cg1y00k7tsxky2xplb37	NET_IN	39.2	MB/s	\N	2026-11-12 02:25:39.788	2026-11-12 07:32:02.783
cmwd8cg2t00patsxk4kw5z859	cmwd8cg1y00k7tsxky2xplb37	NET_IN	38.8	MB/s	\N	2026-11-12 02:56:18.086	2026-11-12 07:32:02.783
cmwd8cg2t00pbtsxk367i3yja	cmwd8cg1y00k7tsxky2xplb37	NET_IN	42.5	MB/s	\N	2026-11-12 03:26:56.384	2026-11-12 07:32:02.783
cmwd8cg2t00pctsxktagsbf26	cmwd8cg1y00k7tsxky2xplb37	NET_IN	41.8	MB/s	\N	2026-11-12 03:57:34.681	2026-11-12 07:32:02.783
cmwd8cg2t00pdtsxkjb8i0pt1	cmwd8cg1y00k7tsxky2xplb37	NET_IN	44.7	MB/s	\N	2026-11-12 04:28:12.979	2026-11-12 07:32:02.783
cmwd8cg2t00petsxk18l6vq3l	cmwd8cg1y00k7tsxky2xplb37	NET_IN	42.9	MB/s	\N	2026-11-12 04:58:51.277	2026-11-12 07:32:02.783
cmwd8cg2t00pftsxky2fs41c2	cmwd8cg1y00k7tsxky2xplb37	NET_IN	44.7	MB/s	\N	2026-11-12 05:29:29.575	2026-11-12 07:32:02.783
cmwd8cg2t00pgtsxkz7zdth1i	cmwd8cg1y00k7tsxky2xplb37	NET_IN	45.8	MB/s	\N	2026-11-12 06:00:07.873	2026-11-12 07:32:02.783
cmwd8cg2t00phtsxkzdmrkvet	cmwd8cg1y00k7tsxky2xplb37	NET_IN	42.1	MB/s	\N	2026-11-12 06:30:46.171	2026-11-12 07:32:02.783
cmwd8cg2t00pitsxkzrwgfzvy	cmwd8cg1y00k7tsxky2xplb37	NET_IN	42.2	MB/s	\N	2026-11-12 07:01:24.469	2026-11-12 07:32:02.783
cmwd8cg2t00pjtsxkw61wfytf	cmwd8cg1y00k7tsxky2xplb37	NET_IN	37.8	MB/s	\N	2026-11-12 07:32:02.767	2026-11-12 07:32:02.783
cmwd8cg2t00pktsxkhjizon61	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	28.9	MB/s	\N	2026-11-11 07:32:02.768	2026-11-12 07:32:02.783
cmwd8cg2t00pltsxk8k0tk3kq	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	32.2	MB/s	\N	2026-11-11 08:02:41.065	2026-11-12 07:32:02.783
cmwd8cg2t00pmtsxk9ym5273b	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	35.4	MB/s	\N	2026-11-11 08:33:19.363	2026-11-12 07:32:02.783
cmwd8cg2t00pntsxk0t4uh8wv	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	34.1	MB/s	\N	2026-11-11 09:03:57.661	2026-11-12 07:32:02.783
cmwd8cg2t00potsxkv6q9sdmi	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	36.5	MB/s	\N	2026-11-11 09:34:35.959	2026-11-12 07:32:02.783
cmwd8cg2t00pptsxkod5lwptx	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	34.2	MB/s	\N	2026-11-11 10:05:14.257	2026-11-12 07:32:02.783
cmwd8cg2u00pqtsxkjpnfm1wk	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	35.6	MB/s	\N	2026-11-11 10:35:52.555	2026-11-12 07:32:02.783
cmwd8cg2u00prtsxkzuwbflhz	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	32.3	MB/s	\N	2026-11-11 11:06:30.853	2026-11-12 07:32:02.783
cmwd8cg2u00pstsxkhmswbne2	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	32.9	MB/s	\N	2026-11-11 11:37:09.15	2026-11-12 07:32:02.783
cmwd8cg2u00pttsxkb3e2k35k	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	33.1	MB/s	\N	2026-11-11 12:07:47.448	2026-11-12 07:32:02.783
cmwd8cg2u00putsxkd5f2fu54	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	29.2	MB/s	\N	2026-11-11 12:38:25.746	2026-11-12 07:32:02.783
cmwd8cg2u00pvtsxko3l19ukc	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	29.5	MB/s	\N	2026-11-11 13:09:04.044	2026-11-12 07:32:02.783
cmwd8cg2u00pwtsxkj383921x	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	25.8	MB/s	\N	2026-11-11 13:39:42.342	2026-11-12 07:32:02.783
cmwd8cg2u00pxtsxkip3hoxse	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	26.8	MB/s	\N	2026-11-11 14:10:20.64	2026-11-12 07:32:02.783
cmwd8cg2u00pytsxkk9i7z1q0	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	24.1	MB/s	\N	2026-11-11 14:40:58.938	2026-11-12 07:32:02.783
cmwd8cg2u00pztsxkdwpelgmf	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	26.1	MB/s	\N	2026-11-11 15:11:37.236	2026-11-12 07:32:02.783
cmwd8cg2u00q0tsxkmj0ow4ru	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	28.6	MB/s	\N	2026-11-11 15:42:15.533	2026-11-12 07:32:02.783
cmwd8cg2u00q1tsxkgmqfqqmg	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	27.3	MB/s	\N	2026-11-11 16:12:53.831	2026-11-12 07:32:02.783
cmwd8cg2u00q2tsxktnnls6pt	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	30.5	MB/s	\N	2026-11-11 16:43:32.129	2026-11-12 07:32:02.783
cmwd8cg2u00q3tsxkkpg9ey0o	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	29.7	MB/s	\N	2026-11-11 17:14:10.427	2026-11-12 07:32:02.783
cmwd8cg2u00q4tsxk7b4fi2wd	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	33.1	MB/s	\N	2026-11-11 17:44:48.725	2026-11-12 07:32:02.783
cmwd8cg2u00q5tsxk9gg5ucd2	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	32	MB/s	\N	2026-11-11 18:15:27.023	2026-11-12 07:32:02.783
cmwd8cg2u00q6tsxk3pkk6727	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	34.8	MB/s	\N	2026-11-11 18:46:05.321	2026-11-12 07:32:02.783
cmwd8cg2u00q7tsxkpmkqgye2	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	37.2	MB/s	\N	2026-11-11 19:16:43.619	2026-11-12 07:32:02.783
cmwd8cg2u00q8tsxkmx7mf0r1	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	34.8	MB/s	\N	2026-11-11 19:47:21.916	2026-11-12 07:32:02.783
cmwd8cg2u00q9tsxkvdqoujt6	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	36.1	MB/s	\N	2026-11-11 20:18:00.214	2026-11-12 07:32:02.783
cmwd8cg2u00qatsxkxz5vrhem	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	32.8	MB/s	\N	2026-11-11 20:48:38.512	2026-11-12 07:32:02.783
cmwd8cg2u00qbtsxkh03augdw	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	33.2	MB/s	\N	2026-11-11 21:19:16.81	2026-11-12 07:32:02.783
cmwd8cg2u00qctsxkqtc6rwda	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	29.3	MB/s	\N	2026-11-11 21:49:55.108	2026-11-12 07:32:02.783
cmwd8cg2u00qdtsxkds80st15	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	29.5	MB/s	\N	2026-11-11 22:20:33.406	2026-11-12 07:32:02.783
cmwd8cg2u00qetsxkkxosbofu	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	29.9	MB/s	\N	2026-11-11 22:51:11.704	2026-11-12 07:32:02.783
cmwd8cg2u00qftsxku2od5if0	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	26.3	MB/s	\N	2026-11-11 23:21:50.002	2026-11-12 07:32:02.783
cmwd8cg2u00qgtsxks4gjvzqx	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	27.3	MB/s	\N	2026-11-11 23:52:28.299	2026-11-12 07:32:02.783
cmwd8cg2u00qhtsxko4ykbban	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	24.7	MB/s	\N	2026-11-12 00:23:06.597	2026-11-12 07:32:02.783
cmwd8cg2u00qitsxkb8kxfeur	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	26.7	MB/s	\N	2026-11-12 00:53:44.895	2026-11-12 07:32:02.783
cmwd8cg2u00qjtsxklcymmbyr	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	25.1	MB/s	\N	2026-11-12 01:24:23.193	2026-11-12 07:32:02.783
cmwd8cg2u00qktsxkp5oqioyy	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	28.1	MB/s	\N	2026-11-12 01:55:01.491	2026-11-12 07:32:02.783
cmwd8cg2u00qltsxk5q2ngg8o	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	31.4	MB/s	\N	2026-11-12 02:25:39.789	2026-11-12 07:32:02.783
cmwd8cg2u00qmtsxkzndh3ig6	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	30.5	MB/s	\N	2026-11-12 02:56:18.087	2026-11-12 07:32:02.783
cmwd8cg2u00qntsxkwpxcwtib	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	33.9	MB/s	\N	2026-11-12 03:26:56.385	2026-11-12 07:32:02.783
cmwd8cg2u00qotsxk90zw2lii	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	32.8	MB/s	\N	2026-11-12 03:57:34.682	2026-11-12 07:32:02.783
cmwd8cg2u00qptsxkgykhs1xt	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	35.5	MB/s	\N	2026-11-12 04:28:12.98	2026-11-12 07:32:02.783
cmwd8cg2u00qqtsxkblqooqvq	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	33.6	MB/s	\N	2026-11-12 04:58:51.278	2026-11-12 07:32:02.783
cmwd8cg2u00qrtsxk647gkitt	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	35.4	MB/s	\N	2026-11-12 05:29:29.576	2026-11-12 07:32:02.783
cmwd8cg2u00qstsxkdrvpn2gl	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	36.6	MB/s	\N	2026-11-12 06:00:07.874	2026-11-12 07:32:02.783
cmwd8cg2u00qttsxkstqyjrud	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	33.2	MB/s	\N	2026-11-12 06:30:46.172	2026-11-12 07:32:02.783
cmwd8cg2u00qutsxk0assea6p	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	33.6	MB/s	\N	2026-11-12 07:01:24.47	2026-11-12 07:32:02.783
cmwd8cg2u00qvtsxkie93py44	cmwd8cg1y00k7tsxky2xplb37	NET_OUT	29.7	MB/s	\N	2026-11-12 07:32:02.768	2026-11-12 07:32:02.783
cmwd8cg8m00qxtsxkmwl8e8yg	cmwd8cg8100qwtsxkkntno165	CPU	64.2	%	\N	2026-11-11 07:32:02.981	2026-11-12 07:32:02.996
cmwd8cg8m00qytsxk1yojy1po	cmwd8cg8100qwtsxkkntno165	CPU	67.6	%	\N	2026-11-11 08:02:41.278	2026-11-12 07:32:02.996
cmwd8cg8m00qztsxkqpggrvm1	cmwd8cg8100qwtsxkkntno165	CPU	70.9	%	\N	2026-11-11 08:33:19.576	2026-11-12 07:32:02.996
cmwd8cg8m00r0tsxk2zw0e0up	cmwd8cg8100qwtsxkkntno165	CPU	69.6	%	\N	2026-11-11 09:03:57.874	2026-11-12 07:32:02.996
cmwd8cg8m00r1tsxky6k8dsbd	cmwd8cg8100qwtsxkkntno165	CPU	72	%	\N	2026-11-11 09:34:36.172	2026-11-12 07:32:02.996
cmwd8cg8m00r2tsxkktmrx2pv	cmwd8cg8100qwtsxkkntno165	CPU	69.8	%	\N	2026-11-11 10:05:14.47	2026-11-12 07:32:02.996
cmwd8cg8m00r3tsxkvat4xzwz	cmwd8cg8100qwtsxkkntno165	CPU	71.2	%	\N	2026-11-11 10:35:52.768	2026-11-12 07:32:02.996
cmwd8cg8m00r4tsxkwwofmmsu	cmwd8cg8100qwtsxkkntno165	CPU	68	%	\N	2026-11-11 11:06:31.066	2026-11-12 07:32:02.996
cmwd8cg8m00r5tsxkwig4i4zw	cmwd8cg8100qwtsxkkntno165	CPU	68.5	%	\N	2026-11-11 11:37:09.363	2026-11-12 07:32:02.996
cmwd8cg8m00r6tsxk5eco0zv4	cmwd8cg8100qwtsxkkntno165	CPU	68.9	%	\N	2026-11-11 12:07:47.661	2026-11-12 07:32:02.996
cmwd8cg8m00r7tsxk0u1rkkgc	cmwd8cg8100qwtsxkkntno165	CPU	64.9	%	\N	2026-11-11 12:38:25.959	2026-11-12 07:32:02.996
cmwd8cg8m00r8tsxkl34oipfv	cmwd8cg8100qwtsxkkntno165	CPU	65.3	%	\N	2026-11-11 13:09:04.257	2026-11-12 07:32:02.996
cmwd8cg8m00r9tsxk70xv25im	cmwd8cg8100qwtsxkkntno165	CPU	61.7	%	\N	2026-11-11 13:39:42.555	2026-11-12 07:32:02.996
cmwd8cg8m00ratsxk07oh430u	cmwd8cg8100qwtsxkkntno165	CPU	62.7	%	\N	2026-11-11 14:10:20.853	2026-11-12 07:32:02.996
cmwd8cg8m00rbtsxknd5scxpr	cmwd8cg8100qwtsxkkntno165	CPU	60	%	\N	2026-11-11 14:40:59.151	2026-11-12 07:32:02.996
cmwd8cg8m00rctsxk0t58aay8	cmwd8cg8100qwtsxkkntno165	CPU	62	%	\N	2026-11-11 15:11:37.449	2026-11-12 07:32:02.996
cmwd8cg8m00rdtsxkplehyj21	cmwd8cg8100qwtsxkkntno165	CPU	64.6	%	\N	2026-11-11 15:42:15.746	2026-11-12 07:32:02.996
cmwd8cg8m00retsxk7ql1udnl	cmwd8cg8100qwtsxkkntno165	CPU	63.3	%	\N	2026-11-11 16:12:54.044	2026-11-12 07:32:02.996
cmwd8cg8m00rftsxkio3yatai	cmwd8cg8100qwtsxkkntno165	CPU	66.6	%	\N	2026-11-11 16:43:32.342	2026-11-12 07:32:02.996
cmwd8cg8m00rgtsxk6yp7sio2	cmwd8cg8100qwtsxkkntno165	CPU	65.8	%	\N	2026-11-11 17:14:10.64	2026-11-12 07:32:02.996
cmwd8cg8m00rhtsxk73fvom2u	cmwd8cg8100qwtsxkkntno165	CPU	69.2	%	\N	2026-11-11 17:44:48.938	2026-11-12 07:32:02.996
cmwd8cg8m00ritsxkeq71u5rz	cmwd8cg8100qwtsxkkntno165	CPU	68.2	%	\N	2026-11-11 18:15:27.236	2026-11-12 07:32:02.996
cmwd8cg8m00rjtsxkr43g59x6	cmwd8cg8100qwtsxkkntno165	CPU	71.1	%	\N	2026-11-11 18:46:05.534	2026-11-12 07:32:02.996
cmwd8cg8m00rktsxkb25erseh	cmwd8cg8100qwtsxkkntno165	CPU	73.5	%	\N	2026-11-11 19:16:43.832	2026-11-12 07:32:02.996
cmwd8cg8m00rltsxkin7xgp38	cmwd8cg8100qwtsxkkntno165	CPU	71.1	%	\N	2026-11-11 19:47:22.129	2026-11-12 07:32:02.996
cmwd8cg8m00rmtsxkp7cvflrz	cmwd8cg8100qwtsxkkntno165	CPU	72.5	%	\N	2026-11-11 20:18:00.427	2026-11-12 07:32:02.996
cmwd8cg8m00rntsxkuhi427od	cmwd8cg8100qwtsxkkntno165	CPU	69.2	%	\N	2026-11-11 20:48:38.725	2026-11-12 07:32:02.996
cmwd8cg8m00rotsxkecgs63kf	cmwd8cg8100qwtsxkkntno165	CPU	69.7	%	\N	2026-11-11 21:19:17.023	2026-11-12 07:32:02.996
cmwd8cg8m00rptsxkhsz7euzu	cmwd8cg8100qwtsxkkntno165	CPU	65.8	%	\N	2026-11-11 21:49:55.321	2026-11-12 07:32:02.996
cmwd8cg8m00rqtsxkk1gy3yss	cmwd8cg8100qwtsxkkntno165	CPU	66.1	%	\N	2026-11-11 22:20:33.619	2026-11-12 07:32:02.996
cmwd8cg8m00rrtsxk3lx7prws	cmwd8cg8100qwtsxkkntno165	CPU	66.4	%	\N	2026-11-11 22:51:11.917	2026-11-12 07:32:02.996
cmwd8cg8m00rstsxkfwt8s9kr	cmwd8cg8100qwtsxkkntno165	CPU	62.9	%	\N	2026-11-11 23:21:50.215	2026-11-12 07:32:02.996
cmwd8cg8m00rttsxk1o43xoj4	cmwd8cg8100qwtsxkkntno165	CPU	64	%	\N	2026-11-11 23:52:28.512	2026-11-12 07:32:02.996
cmwd8cg8m00rutsxk39flzbff	cmwd8cg8100qwtsxkkntno165	CPU	61.4	%	\N	2026-11-12 00:23:06.81	2026-11-12 07:32:02.996
cmwd8cg8m00rvtsxkt652fbmp	cmwd8cg8100qwtsxkkntno165	CPU	63.5	%	\N	2026-11-12 00:53:45.108	2026-11-12 07:32:02.996
cmwd8cg8m00rwtsxkwvz9hh17	cmwd8cg8100qwtsxkkntno165	CPU	61.9	%	\N	2026-11-12 01:24:23.406	2026-11-12 07:32:02.996
cmwd8cg8m00rxtsxk3wyxuq6b	cmwd8cg8100qwtsxkkntno165	CPU	64.9	%	\N	2026-11-12 01:55:01.704	2026-11-12 07:32:02.996
cmwd8cg8m00rytsxksr8py9ro	cmwd8cg8100qwtsxkkntno165	CPU	68.2	%	\N	2026-11-12 02:25:40.002	2026-11-12 07:32:02.996
cmwd8cg8m00rztsxkap5jn3cv	cmwd8cg8100qwtsxkkntno165	CPU	67.5	%	\N	2026-11-12 02:56:18.3	2026-11-12 07:32:02.996
cmwd8cg8n00s0tsxk0bhgd6ci	cmwd8cg8100qwtsxkkntno165	CPU	70.8	%	\N	2026-11-12 03:26:56.598	2026-11-12 07:32:02.996
cmwd8cg8n00s1tsxkq1tov9do	cmwd8cg8100qwtsxkkntno165	CPU	69.8	%	\N	2026-11-12 03:57:34.895	2026-11-12 07:32:02.996
cmwd8cg8n00s2tsxkwponzfm2	cmwd8cg8100qwtsxkkntno165	CPU	72.6	%	\N	2026-11-12 04:28:13.193	2026-11-12 07:32:02.996
cmwd8cg8n00s3tsxkdxmkganp	cmwd8cg8100qwtsxkkntno165	CPU	70.7	%	\N	2026-11-12 04:58:51.491	2026-11-12 07:32:02.996
cmwd8cg8n00s4tsxkji29w0u1	cmwd8cg8100qwtsxkkntno165	CPU	72.5	%	\N	2026-11-12 05:29:29.789	2026-11-12 07:32:02.996
cmwd8cg8n00s5tsxkzxbgtfgz	cmwd8cg8100qwtsxkkntno165	CPU	73.8	%	\N	2026-11-12 06:00:08.087	2026-11-12 07:32:02.996
cmwd8cg8n00s6tsxkvyhi4nln	cmwd8cg8100qwtsxkkntno165	CPU	70.4	%	\N	2026-11-12 06:30:46.385	2026-11-12 07:32:02.996
cmwd8cg8n00s7tsxk4ha25ail	cmwd8cg8100qwtsxkkntno165	CPU	70.9	%	\N	2026-11-12 07:01:24.683	2026-11-12 07:32:02.996
cmwd8cg8n00s8tsxk1ag4h9i3	cmwd8cg8100qwtsxkkntno165	CPU	67	%	\N	2026-11-12 07:32:02.981	2026-11-12 07:32:02.996
cmwd8cg8n00s9tsxksnfw5xzw	cmwd8cg8100qwtsxkkntno165	MEM	56.2	%	\N	2026-11-11 07:32:02.981	2026-11-12 07:32:02.996
cmwd8cg8n00satsxkf2bnaef5	cmwd8cg8100qwtsxkkntno165	MEM	59.3	%	\N	2026-11-11 08:02:41.278	2026-11-12 07:32:02.996
cmwd8cg8n00sbtsxku337ywm0	cmwd8cg8100qwtsxkkntno165	MEM	62.2	%	\N	2026-11-11 08:33:19.576	2026-11-12 07:32:02.996
cmwd8cg8n00sctsxkxmhgu5ta	cmwd8cg8100qwtsxkkntno165	MEM	60.7	%	\N	2026-11-11 09:03:57.874	2026-11-12 07:32:02.996
cmwd8cg8n00sdtsxkqk8zx3o5	cmwd8cg8100qwtsxkkntno165	MEM	63.1	%	\N	2026-11-11 09:34:36.172	2026-11-12 07:32:02.996
cmwd8cg8n00setsxklvjzuoxi	cmwd8cg8100qwtsxkkntno165	MEM	60.9	%	\N	2026-11-11 10:05:14.47	2026-11-12 07:32:02.996
cmwd8cg8n00sftsxkaox3j3dd	cmwd8cg8100qwtsxkkntno165	MEM	62.5	%	\N	2026-11-11 10:35:52.768	2026-11-12 07:32:02.996
cmwd8cg8n00sgtsxkb4k17udj	cmwd8cg8100qwtsxkkntno165	MEM	59.5	%	\N	2026-11-11 11:06:31.066	2026-11-12 07:32:02.996
cmwd8cg8n00shtsxkvreq00pb	cmwd8cg8100qwtsxkkntno165	MEM	60.5	%	\N	2026-11-11 11:37:09.363	2026-11-12 07:32:02.996
cmwd8cg8n00sitsxkuw2gdgwb	cmwd8cg8100qwtsxkkntno165	MEM	61.2	%	\N	2026-11-11 12:07:47.661	2026-11-12 07:32:02.996
cmwd8cg8n00sjtsxkak92bxms	cmwd8cg8100qwtsxkkntno165	MEM	57.8	%	\N	2026-11-11 12:38:25.959	2026-11-12 07:32:02.996
cmwd8cg8n00sktsxkc7rjyp5e	cmwd8cg8100qwtsxkkntno165	MEM	58.5	%	\N	2026-11-11 13:09:04.257	2026-11-12 07:32:02.996
cmwd8cg8n00sltsxkoy4l97oq	cmwd8cg8100qwtsxkkntno165	MEM	55.3	%	\N	2026-11-11 13:39:42.555	2026-11-12 07:32:02.996
cmwd8cg8n00smtsxk60m9m49s	cmwd8cg8100qwtsxkkntno165	MEM	56.6	%	\N	2026-11-11 14:10:20.853	2026-11-12 07:32:02.996
cmwd8cg8n00sntsxk5sgrbwzv	cmwd8cg8100qwtsxkkntno165	MEM	54.1	%	\N	2026-11-11 14:40:59.151	2026-11-12 07:32:02.996
cmwd8cg8n00sotsxk9p65s89u	cmwd8cg8100qwtsxkkntno165	MEM	56.1	%	\N	2026-11-11 15:11:37.449	2026-11-12 07:32:02.996
cmwd8cg8n00sptsxkp8cn3n7m	cmwd8cg8100qwtsxkkntno165	MEM	58.5	%	\N	2026-11-11 15:42:15.746	2026-11-12 07:32:02.996
cmwd8cg8n00sqtsxkxwpoqjhp	cmwd8cg8100qwtsxkkntno165	MEM	57.1	%	\N	2026-11-11 16:12:54.044	2026-11-12 07:32:02.996
cmwd8cg8n00srtsxkwsboik1c	cmwd8cg8100qwtsxkkntno165	MEM	60.1	%	\N	2026-11-11 16:43:32.342	2026-11-12 07:32:02.996
cmwd8cg8n00sstsxk5f3iodmm	cmwd8cg8100qwtsxkkntno165	MEM	59	%	\N	2026-11-11 17:14:10.64	2026-11-12 07:32:02.996
cmwd8cg8n00sttsxkextgma56	cmwd8cg8100qwtsxkkntno165	MEM	62	%	\N	2026-11-11 17:44:48.938	2026-11-12 07:32:02.996
cmwd8cg8n00sutsxk4y87zmy8	cmwd8cg8100qwtsxkkntno165	MEM	60.8	%	\N	2026-11-11 18:15:27.236	2026-11-12 07:32:02.996
cmwd8cg8n00svtsxktwujpapj	cmwd8cg8100qwtsxkkntno165	MEM	63.4	%	\N	2026-11-11 18:46:05.534	2026-11-12 07:32:02.996
cmwd8cg8n00swtsxk1xao642b	cmwd8cg8100qwtsxkkntno165	MEM	65.7	%	\N	2026-11-11 19:16:43.832	2026-11-12 07:32:02.996
cmwd8cg8n00sxtsxkkyvmnr6f	cmwd8cg8100qwtsxkkntno165	MEM	63.5	%	\N	2026-11-11 19:47:22.129	2026-11-12 07:32:02.996
cmwd8cg8n00sytsxkfpshou3j	cmwd8cg8100qwtsxkkntno165	MEM	65	%	\N	2026-11-11 20:18:00.427	2026-11-12 07:32:02.996
cmwd8cg8n00sztsxk24whzu91	cmwd8cg8100qwtsxkkntno165	MEM	62	%	\N	2026-11-11 20:48:38.725	2026-11-12 07:32:02.996
cmwd8cg8n00t0tsxkmfc2n70v	cmwd8cg8100qwtsxkkntno165	MEM	62.9	%	\N	2026-11-11 21:19:17.023	2026-11-12 07:32:02.996
cmwd8cg8n00t1tsxkleyi65tk	cmwd8cg8100qwtsxkkntno165	MEM	59.4	%	\N	2026-11-11 21:49:55.321	2026-11-12 07:32:02.996
cmwd8cg8o00t2tsxkpnn1pzlz	cmwd8cg8100qwtsxkkntno165	MEM	60.2	%	\N	2026-11-11 22:20:33.619	2026-11-12 07:32:02.996
cmwd8cg8o00t3tsxki11vfvof	cmwd8cg8100qwtsxkkntno165	MEM	61	%	\N	2026-11-11 22:51:11.917	2026-11-12 07:32:02.996
cmwd8cg8o00t4tsxko72ol4lx	cmwd8cg8100qwtsxkkntno165	MEM	57.8	%	\N	2026-11-11 23:21:50.215	2026-11-12 07:32:02.996
cmwd8cg8o00t5tsxkpqrc0isi	cmwd8cg8100qwtsxkkntno165	MEM	59.1	%	\N	2026-11-11 23:52:28.512	2026-11-12 07:32:02.996
cmwd8cg8o00t6tsxk76gn59sr	cmwd8cg8100qwtsxkkntno165	MEM	56.6	%	\N	2026-11-12 00:23:06.81	2026-11-12 07:32:02.996
cmwd8cg8o00t7tsxk4y4pa7s1	cmwd8cg8100qwtsxkkntno165	MEM	58.7	%	\N	2026-11-12 00:53:45.108	2026-11-12 07:32:02.996
cmwd8cg8o00t8tsxkjjh8mawn	cmwd8cg8100qwtsxkkntno165	MEM	57	%	\N	2026-11-12 01:24:23.406	2026-11-12 07:32:02.996
cmwd8cg8o00t9tsxkp3mnbeu0	cmwd8cg8100qwtsxkkntno165	MEM	59.8	%	\N	2026-11-12 01:55:01.704	2026-11-12 07:32:02.996
cmwd8cg8o00tatsxkqqsvcwvm	cmwd8cg8100qwtsxkkntno165	MEM	62.8	%	\N	2026-11-12 02:25:40.002	2026-11-12 07:32:02.996
cmwd8cg8o00tbtsxkr7aoj4pb	cmwd8cg8100qwtsxkkntno165	MEM	61.7	%	\N	2026-11-12 02:56:18.3	2026-11-12 07:32:02.996
cmwd8cg8o00tctsxk71qs8noh	cmwd8cg8100qwtsxkkntno165	MEM	64.8	%	\N	2026-11-12 03:26:56.598	2026-11-12 07:32:02.996
cmwd8cg8o00tdtsxko5yj9pqi	cmwd8cg8100qwtsxkkntno165	MEM	63.5	%	\N	2026-11-12 03:57:34.895	2026-11-12 07:32:02.996
cmwd8cg8o00tetsxkfv702tg3	cmwd8cg8100qwtsxkkntno165	MEM	66.1	%	\N	2026-11-12 04:28:13.193	2026-11-12 07:32:02.996
cmwd8cg8o00tftsxk4u1fs3xl	cmwd8cg8100qwtsxkkntno165	MEM	64.1	%	\N	2026-11-12 04:58:51.491	2026-11-12 07:32:02.996
cmwd8cg8o00tgtsxkk9pzuo3q	cmwd8cg8100qwtsxkkntno165	MEM	66	%	\N	2026-11-12 05:29:29.789	2026-11-12 07:32:02.996
cmwd8cg8o00thtsxko1ry5019	cmwd8cg8100qwtsxkkntno165	MEM	67.5	%	\N	2026-11-12 06:00:08.087	2026-11-12 07:32:02.996
cmwd8cg8o00titsxkzj0dp1wt	cmwd8cg8100qwtsxkkntno165	MEM	64.4	%	\N	2026-11-12 06:30:46.385	2026-11-12 07:32:02.996
cmwd8cg8o00tjtsxkkx57x6fu	cmwd8cg8100qwtsxkkntno165	MEM	65.3	%	\N	2026-11-12 07:01:24.683	2026-11-12 07:32:02.996
cmwd8cg8o00tktsxkdvqkridi	cmwd8cg8100qwtsxkkntno165	MEM	61.8	%	\N	2026-11-12 07:32:02.981	2026-11-12 07:32:02.996
cmwd8cg8o00tltsxk84c2of5k	cmwd8cg8100qwtsxkkntno165	DISK	42.2	%	\N	2026-11-11 07:32:02.983	2026-11-12 07:32:02.996
cmwd8cg8o00tmtsxkjxunx00q	cmwd8cg8100qwtsxkkntno165	DISK	44.6	%	\N	2026-11-11 08:02:41.28	2026-11-12 07:32:02.996
cmwd8cg8o00tntsxko4nov6cn	cmwd8cg8100qwtsxkkntno165	DISK	47	%	\N	2026-11-11 08:33:19.578	2026-11-12 07:32:02.996
cmwd8cg8o00totsxk1d1zjr6w	cmwd8cg8100qwtsxkkntno165	DISK	45	%	\N	2026-11-11 09:03:57.876	2026-11-12 07:32:02.996
cmwd8cg8o00tptsxkz1qxl77v	cmwd8cg8100qwtsxkkntno165	DISK	47	%	\N	2026-11-11 09:34:36.174	2026-11-12 07:32:02.996
cmwd8cg8o00tqtsxku03gy7ab	cmwd8cg8100qwtsxkkntno165	DISK	44.7	%	\N	2026-11-11 10:05:14.472	2026-11-12 07:32:02.996
cmwd8cg8o00trtsxktjowxtc9	cmwd8cg8100qwtsxkkntno165	DISK	46.4	%	\N	2026-11-11 10:35:52.77	2026-11-12 07:32:02.996
cmwd8cg8o00tstsxkvbff1gio	cmwd8cg8100qwtsxkkntno165	DISK	43.6	%	\N	2026-11-11 11:06:31.068	2026-11-12 07:32:02.996
cmwd8cg8o00tttsxk3kegnv3b	cmwd8cg8100qwtsxkkntno165	DISK	45	%	\N	2026-11-11 11:37:09.365	2026-11-12 07:32:02.996
cmwd8cg8o00tutsxk1x9vrpk1	cmwd8cg8100qwtsxkkntno165	DISK	46.2	%	\N	2026-11-11 12:07:47.663	2026-11-12 07:32:02.996
cmwd8cg8o00tvtsxk5h991z8h	cmwd8cg8100qwtsxkkntno165	DISK	43.3	%	\N	2026-11-11 12:38:25.961	2026-11-12 07:32:02.996
cmwd8cg8o00twtsxkukmugd3w	cmwd8cg8100qwtsxkkntno165	DISK	44.5	%	\N	2026-11-11 13:09:04.259	2026-11-12 07:32:02.996
cmwd8cg8o00txtsxkc57pdp61	cmwd8cg8100qwtsxkkntno165	DISK	41.7	%	\N	2026-11-11 13:39:42.557	2026-11-12 07:32:02.996
cmwd8cg8o00tytsxk73i7vh8w	cmwd8cg8100qwtsxkkntno165	DISK	43.2	%	\N	2026-11-11 14:10:20.855	2026-11-12 07:32:02.996
cmwd8cg8o00tztsxk1yvs70jw	cmwd8cg8100qwtsxkkntno165	DISK	40.7	%	\N	2026-11-11 14:40:59.153	2026-11-12 07:32:02.996
cmwd8cg8o00u0tsxk2mqlmbq4	cmwd8cg8100qwtsxkkntno165	DISK	42.6	%	\N	2026-11-11 15:11:37.451	2026-11-12 07:32:02.996
cmwd8cg8o00u1tsxkczzimax6	cmwd8cg8100qwtsxkkntno165	DISK	44.7	%	\N	2026-11-11 15:42:15.748	2026-11-12 07:32:02.996
cmwd8cg8o00u2tsxkvlokfwda	cmwd8cg8100qwtsxkkntno165	DISK	42.7	%	\N	2026-11-11 16:12:54.046	2026-11-12 07:32:02.996
cmwd8cg8o00u3tsxki90c1u8l	cmwd8cg8100qwtsxkkntno165	DISK	45.1	%	\N	2026-11-11 16:43:32.344	2026-11-12 07:32:02.996
cmwd8cg8o00u4tsxklbw24tf2	cmwd8cg8100qwtsxkkntno165	DISK	43.3	%	\N	2026-11-11 17:14:10.642	2026-11-12 07:32:02.996
cmwd8cg8p00u5tsxkk3kpkeup	cmwd8cg8100qwtsxkkntno165	DISK	45.7	%	\N	2026-11-11 17:44:48.94	2026-11-12 07:32:02.996
cmwd8cg8p00u6tsxkkntsxy39	cmwd8cg8100qwtsxkkntno165	DISK	43.8	%	\N	2026-11-11 18:15:27.238	2026-11-12 07:32:02.996
cmwd8cg8p00u7tsxkbpp3qwuw	cmwd8cg8100qwtsxkkntno165	DISK	46	%	\N	2026-11-11 18:46:05.536	2026-11-12 07:32:02.996
cmwd8cg8p00u8tsxk9vi0e5q8	cmwd8cg8100qwtsxkkntno165	DISK	48	%	\N	2026-11-11 19:16:43.834	2026-11-12 07:32:02.996
cmwd8cg8p00u9tsxkkwn8omk6	cmwd8cg8100qwtsxkkntno165	DISK	45.7	%	\N	2026-11-11 19:47:22.131	2026-11-12 07:32:02.996
cmwd8cg8p00uatsxkqngtkq5s	cmwd8cg8100qwtsxkkntno165	DISK	47.3	%	\N	2026-11-11 20:18:00.429	2026-11-12 07:32:02.996
cmwd8cg8p00ubtsxkzp085jlw	cmwd8cg8100qwtsxkkntno165	DISK	44.6	%	\N	2026-11-11 20:48:38.727	2026-11-12 07:32:02.996
cmwd8cg8p00uctsxk1n7lyn0c	cmwd8cg8100qwtsxkkntno165	DISK	45.9	%	\N	2026-11-11 21:19:17.025	2026-11-12 07:32:02.996
cmwd8cg8p00udtsxklnc007ne	cmwd8cg8100qwtsxkkntno165	DISK	42.9	%	\N	2026-11-11 21:49:55.323	2026-11-12 07:32:02.996
cmwd8cg8p00uetsxk9d07k7rm	cmwd8cg8100qwtsxkkntno165	DISK	44.2	%	\N	2026-11-11 22:20:33.621	2026-11-12 07:32:02.996
cmwd8cg8p00uftsxko5mtwv6i	cmwd8cg8100qwtsxkkntno165	DISK	45.4	%	\N	2026-11-11 22:51:11.919	2026-11-12 07:32:02.996
cmwd8cg8p00ugtsxk8volkpuw	cmwd8cg8100qwtsxkkntno165	DISK	42.6	%	\N	2026-11-11 23:21:50.217	2026-11-12 07:32:02.996
cmwd8cg8p00uhtsxks3zmnaz3	cmwd8cg8100qwtsxkkntno165	DISK	44.2	%	\N	2026-11-11 23:52:28.514	2026-11-12 07:32:02.996
cmwd8cg8p00uitsxk9kv0gwis	cmwd8cg8100qwtsxkkntno165	DISK	41.7	%	\N	2026-11-12 00:23:06.812	2026-11-12 07:32:02.996
cmwd8cg8p00ujtsxka1pupyzv	cmwd8cg8100qwtsxkkntno165	DISK	43.6	%	\N	2026-11-12 00:53:45.11	2026-11-12 07:32:02.996
cmwd8cg8p00uktsxk9biskn47	cmwd8cg8100qwtsxkkntno165	DISK	41.5	%	\N	2026-11-12 01:24:23.408	2026-11-12 07:32:02.996
cmwd8cg8p00ultsxkaeczulzc	cmwd8cg8100qwtsxkkntno165	DISK	43.8	%	\N	2026-11-12 01:55:01.706	2026-11-12 07:32:02.996
cmwd8cg8p00umtsxkg8y0h2vk	cmwd8cg8100qwtsxkkntno165	DISK	46.2	%	\N	2026-11-12 02:25:40.004	2026-11-12 07:32:02.996
cmwd8cg8p00untsxk28iuak8h	cmwd8cg8100qwtsxkkntno165	DISK	44.4	%	\N	2026-11-12 02:56:18.302	2026-11-12 07:32:02.996
cmwd8cg8p00uotsxk9x20o55z	cmwd8cg8100qwtsxkkntno165	DISK	46.8	%	\N	2026-11-12 03:26:56.6	2026-11-12 07:32:02.996
cmwd8cg8p00uptsxkn5c8e1m4	cmwd8cg8100qwtsxkkntno165	DISK	44.9	%	\N	2026-11-12 03:57:34.897	2026-11-12 07:32:02.996
cmwd8cg8p00uqtsxkesg8zzvx	cmwd8cg8100qwtsxkkntno165	DISK	47.1	%	\N	2026-11-12 04:28:13.195	2026-11-12 07:32:02.996
cmwd8cg8p00urtsxkz3szba9k	cmwd8cg8100qwtsxkkntno165	DISK	44.9	%	\N	2026-11-12 04:58:51.493	2026-11-12 07:32:02.996
cmwd8cg8p00ustsxkz4a23ts9	cmwd8cg8100qwtsxkkntno165	DISK	46.7	%	\N	2026-11-12 05:29:29.791	2026-11-12 07:32:02.996
cmwd8cg8p00uttsxkd9tbz0pf	cmwd8cg8100qwtsxkkntno165	DISK	48.3	%	\N	2026-11-12 06:00:08.089	2026-11-12 07:32:02.996
cmwd8cg8p00uutsxkvfgggpoi	cmwd8cg8100qwtsxkkntno165	DISK	45.5	%	\N	2026-11-12 06:30:46.387	2026-11-12 07:32:02.996
cmwd8cg8p00uvtsxkgjegsd4u	cmwd8cg8100qwtsxkkntno165	DISK	46.8	%	\N	2026-11-12 07:01:24.685	2026-11-12 07:32:02.996
cmwd8cg8p00uwtsxk2wimh8yf	cmwd8cg8100qwtsxkkntno165	DISK	43.9	%	\N	2026-11-12 07:32:02.983	2026-11-12 07:32:02.996
cmwd8cg8p00uxtsxker6oqvtw	cmwd8cg8100qwtsxkkntno165	NET_IN	31.4	MB/s	\N	2026-11-11 07:32:02.983	2026-11-12 07:32:02.996
cmwd8cg8p00uytsxkc6w8b8vl	cmwd8cg8100qwtsxkkntno165	NET_IN	35.2	MB/s	\N	2026-11-11 08:02:41.28	2026-11-12 07:32:02.996
cmwd8cg8p00uztsxk5r5sbbtx	cmwd8cg8100qwtsxkkntno165	NET_IN	38.7	MB/s	\N	2026-11-11 08:33:19.578	2026-11-12 07:32:02.996
cmwd8cg8p00v0tsxkjnvkscir	cmwd8cg8100qwtsxkkntno165	NET_IN	37.6	MB/s	\N	2026-11-11 09:03:57.876	2026-11-12 07:32:02.996
cmwd8cg8p00v1tsxkqno9cjoz	cmwd8cg8100qwtsxkkntno165	NET_IN	40.2	MB/s	\N	2026-11-11 09:34:36.174	2026-11-12 07:32:02.996
cmwd8cg8p00v2tsxk45xglgyt	cmwd8cg8100qwtsxkkntno165	NET_IN	38	MB/s	\N	2026-11-11 10:05:14.472	2026-11-12 07:32:02.996
cmwd8cg8p00v3tsxkghotlva1	cmwd8cg8100qwtsxkkntno165	NET_IN	39.3	MB/s	\N	2026-11-11 10:35:52.77	2026-11-12 07:32:02.996
cmwd8cg8p00v4tsxkk3eezweq	cmwd8cg8100qwtsxkkntno165	NET_IN	35.7	MB/s	\N	2026-11-11 11:06:31.068	2026-11-12 07:32:02.996
cmwd8cg8p00v5tsxkuolfo5r9	cmwd8cg8100qwtsxkkntno165	NET_IN	35.9	MB/s	\N	2026-11-11 11:37:09.365	2026-11-12 07:32:02.996
cmwd8cg8p00v6tsxkskb0rljm	cmwd8cg8100qwtsxkkntno165	NET_IN	35.8	MB/s	\N	2026-11-11 12:07:47.663	2026-11-12 07:32:02.996
cmwd8cg8p00v7tsxkwajfb0o9	cmwd8cg8100qwtsxkkntno165	NET_IN	31.5	MB/s	\N	2026-11-11 12:38:25.961	2026-11-12 07:32:02.996
cmwd8cg8p00v8tsxkir8pe4sa	cmwd8cg8100qwtsxkkntno165	NET_IN	31.4	MB/s	\N	2026-11-11 13:09:04.259	2026-11-12 07:32:02.996
cmwd8cg8p00v9tsxkn0jgps6f	cmwd8cg8100qwtsxkkntno165	NET_IN	27.5	MB/s	\N	2026-11-11 13:39:42.557	2026-11-12 07:32:02.996
cmwd8cg8q00vatsxk14ynrmcf	cmwd8cg8100qwtsxkkntno165	NET_IN	28.2	MB/s	\N	2026-11-11 14:10:20.855	2026-11-12 07:32:02.996
cmwd8cg8q00vbtsxk30ngsqgq	cmwd8cg8100qwtsxkkntno165	NET_IN	25.4	MB/s	\N	2026-11-11 14:40:59.153	2026-11-12 07:32:02.996
cmwd8cg8q00vctsxkz3bhckox	cmwd8cg8100qwtsxkkntno165	NET_IN	27.4	MB/s	\N	2026-11-11 15:11:37.451	2026-11-12 07:32:02.996
cmwd8cg8q00vdtsxkp65n2fff	cmwd8cg8100qwtsxkkntno165	NET_IN	30.1	MB/s	\N	2026-11-11 15:42:15.748	2026-11-12 07:32:02.996
cmwd8cg8q00vetsxkwrt6byti	cmwd8cg8100qwtsxkkntno165	NET_IN	29.1	MB/s	\N	2026-11-11 16:12:54.046	2026-11-12 07:32:02.996
cmwd8cg8q00vftsxk9pn4u660	cmwd8cg8100qwtsxkkntno165	NET_IN	32.7	MB/s	\N	2026-11-11 16:43:32.344	2026-11-12 07:32:02.996
cmwd8cg8q00vgtsxk8phxxu0d	cmwd8cg8100qwtsxkkntno165	NET_IN	32.3	MB/s	\N	2026-11-11 17:14:10.642	2026-11-12 07:32:02.996
cmwd8cg8q00vhtsxklti8w1yv	cmwd8cg8100qwtsxkkntno165	NET_IN	36	MB/s	\N	2026-11-11 17:44:48.94	2026-11-12 07:32:02.996
cmwd8cg8q00vitsxk0ugqoz60	cmwd8cg8100qwtsxkkntno165	NET_IN	35.3	MB/s	\N	2026-11-11 18:15:27.238	2026-11-12 07:32:02.996
cmwd8cg8q00vjtsxk66fzskds	cmwd8cg8100qwtsxkkntno165	NET_IN	38.4	MB/s	\N	2026-11-11 18:46:05.536	2026-11-12 07:32:02.996
cmwd8cg8q00vktsxk2jjb36u8	cmwd8cg8100qwtsxkkntno165	NET_IN	40.9	MB/s	\N	2026-11-11 19:16:43.834	2026-11-12 07:32:02.996
cmwd8cg8q00vltsxkpb6y5upp	cmwd8cg8100qwtsxkkntno165	NET_IN	38.5	MB/s	\N	2026-11-11 19:47:22.131	2026-11-12 07:32:02.996
cmwd8cg8q00vmtsxkmmg4zddy	cmwd8cg8100qwtsxkkntno165	NET_IN	39.7	MB/s	\N	2026-11-11 20:18:00.429	2026-11-12 07:32:02.996
cmwd8cg8q00vntsxktv3thb54	cmwd8cg8100qwtsxkkntno165	NET_IN	36.1	MB/s	\N	2026-11-11 20:48:38.727	2026-11-12 07:32:02.996
cmwd8cg8q00votsxki1wb6pv5	cmwd8cg8100qwtsxkkntno165	NET_IN	36.3	MB/s	\N	2026-11-11 21:19:17.025	2026-11-12 07:32:02.996
cmwd8cg8q00vptsxk1av83iw7	cmwd8cg8100qwtsxkkntno165	NET_IN	31.9	MB/s	\N	2026-11-11 21:49:55.323	2026-11-12 07:32:02.996
cmwd8cg8q00vqtsxkrqhjfyxa	cmwd8cg8100qwtsxkkntno165	NET_IN	31.8	MB/s	\N	2026-11-11 22:20:33.621	2026-11-12 07:32:02.996
cmwd8cg8q00vrtsxkd8ior572	cmwd8cg8100qwtsxkkntno165	NET_IN	31.7	MB/s	\N	2026-11-11 22:51:11.919	2026-11-12 07:32:02.996
cmwd8cg8q00vstsxk82khsz53	cmwd8cg8100qwtsxkkntno165	NET_IN	27.9	MB/s	\N	2026-11-11 23:21:50.217	2026-11-12 07:32:02.996
cmwd8cg8q00vttsxkwnssxmse	cmwd8cg8100qwtsxkkntno165	NET_IN	28.7	MB/s	\N	2026-11-11 23:52:28.514	2026-11-12 07:32:02.996
cmwd8cg8q00vutsxk2z4u01ad	cmwd8cg8100qwtsxkkntno165	NET_IN	26	MB/s	\N	2026-11-12 00:23:06.812	2026-11-12 07:32:02.996
cmwd8cg8q00vvtsxkacqfte4o	cmwd8cg8100qwtsxkkntno165	NET_IN	28.1	MB/s	\N	2026-11-12 00:53:45.11	2026-11-12 07:32:02.996
cmwd8cg8q00vwtsxk1wj2ah2r	cmwd8cg8100qwtsxkkntno165	NET_IN	26.7	MB/s	\N	2026-11-12 01:24:23.408	2026-11-12 07:32:02.996
cmwd8cg8q00vxtsxk6xykq329	cmwd8cg8100qwtsxkkntno165	NET_IN	30	MB/s	\N	2026-11-12 01:55:01.706	2026-11-12 07:32:02.996
cmwd8cg8q00vytsxk0qkuwwh4	cmwd8cg8100qwtsxkkntno165	NET_IN	33.6	MB/s	\N	2026-11-12 02:25:40.004	2026-11-12 07:32:02.996
cmwd8cg8q00vztsxk04ewofxq	cmwd8cg8100qwtsxkkntno165	NET_IN	33.2	MB/s	\N	2026-11-12 02:56:18.302	2026-11-12 07:32:02.996
cmwd8cg8q00w0tsxknycpuvzq	cmwd8cg8100qwtsxkkntno165	NET_IN	36.9	MB/s	\N	2026-11-12 03:26:56.6	2026-11-12 07:32:02.996
cmwd8cg8q00w1tsxk9ep8ms2j	cmwd8cg8100qwtsxkkntno165	NET_IN	36.2	MB/s	\N	2026-11-12 03:57:34.897	2026-11-12 07:32:02.996
cmwd8cg8q00w2tsxke5ursjbl	cmwd8cg8100qwtsxkkntno165	NET_IN	39.1	MB/s	\N	2026-11-12 04:28:13.195	2026-11-12 07:32:02.996
cmwd8cg8q00w3tsxkxejhdglb	cmwd8cg8100qwtsxkkntno165	NET_IN	37.3	MB/s	\N	2026-11-12 04:58:51.493	2026-11-12 07:32:02.996
cmwd8cg8q00w4tsxkqmmowvx6	cmwd8cg8100qwtsxkkntno165	NET_IN	39.1	MB/s	\N	2026-11-12 05:29:29.791	2026-11-12 07:32:02.996
cmwd8cg8q00w5tsxk337vi6ol	cmwd8cg8100qwtsxkkntno165	NET_IN	40.2	MB/s	\N	2026-11-12 06:00:08.089	2026-11-12 07:32:02.996
cmwd8cg8q00w6tsxkm26aw7be	cmwd8cg8100qwtsxkkntno165	NET_IN	36.5	MB/s	\N	2026-11-12 06:30:46.387	2026-11-12 07:32:02.996
cmwd8cg8q00w7tsxkoq1v0sfs	cmwd8cg8100qwtsxkkntno165	NET_IN	36.6	MB/s	\N	2026-11-12 07:01:24.685	2026-11-12 07:32:02.996
cmwd8cg8q00w8tsxkrfd2e1gp	cmwd8cg8100qwtsxkkntno165	NET_IN	32.2	MB/s	\N	2026-11-12 07:32:02.983	2026-11-12 07:32:02.996
cmwd8cg8q00w9tsxkutyznzkq	cmwd8cg8100qwtsxkkntno165	NET_OUT	24.2	MB/s	\N	2026-11-11 07:32:02.983	2026-11-12 07:32:02.996
cmwd8cg8r00watsxk4wgwe7s2	cmwd8cg8100qwtsxkkntno165	NET_OUT	27.6	MB/s	\N	2026-11-11 08:02:41.28	2026-11-12 07:32:02.996
cmwd8cg8r00wbtsxki9zjkqyv	cmwd8cg8100qwtsxkkntno165	NET_OUT	30.8	MB/s	\N	2026-11-11 08:33:19.578	2026-11-12 07:32:02.996
cmwd8cg8r00wctsxkfaotbgrq	cmwd8cg8100qwtsxkkntno165	NET_OUT	29.4	MB/s	\N	2026-11-11 09:03:57.876	2026-11-12 07:32:02.996
cmwd8cg8r00wdtsxk8p5klv2m	cmwd8cg8100qwtsxkkntno165	NET_OUT	31.9	MB/s	\N	2026-11-11 09:34:36.174	2026-11-12 07:32:02.996
cmwd8cg8r00wetsxks675yh4d	cmwd8cg8100qwtsxkkntno165	NET_OUT	29.6	MB/s	\N	2026-11-11 10:05:14.472	2026-11-12 07:32:02.996
cmwd8cg8r00wftsxku86nlia2	cmwd8cg8100qwtsxkkntno165	NET_OUT	31	MB/s	\N	2026-11-11 10:35:52.77	2026-11-12 07:32:02.996
cmwd8cg8r00wgtsxkaydl3k03	cmwd8cg8100qwtsxkkntno165	NET_OUT	27.7	MB/s	\N	2026-11-11 11:06:31.068	2026-11-12 07:32:02.996
cmwd8cg8r00whtsxk1cdp18qx	cmwd8cg8100qwtsxkkntno165	NET_OUT	28.2	MB/s	\N	2026-11-11 11:37:09.365	2026-11-12 07:32:02.996
cmwd8cg8r00witsxkkck618d7	cmwd8cg8100qwtsxkkntno165	NET_OUT	28.5	MB/s	\N	2026-11-11 12:07:47.663	2026-11-12 07:32:02.996
cmwd8cg8r00wjtsxkseon6787	cmwd8cg8100qwtsxkkntno165	NET_OUT	24.5	MB/s	\N	2026-11-11 12:38:25.961	2026-11-12 07:32:02.996
cmwd8cg8r00wktsxk5981tsz4	cmwd8cg8100qwtsxkkntno165	NET_OUT	24.8	MB/s	\N	2026-11-11 13:09:04.259	2026-11-12 07:32:02.996
cmwd8cg8r00wltsxkg7dtjfs9	cmwd8cg8100qwtsxkkntno165	NET_OUT	21.2	MB/s	\N	2026-11-11 13:39:42.557	2026-11-12 07:32:02.996
cmwd8cg8r00wmtsxkedcao6w3	cmwd8cg8100qwtsxkkntno165	NET_OUT	22.1	MB/s	\N	2026-11-11 14:10:20.855	2026-11-12 07:32:02.996
cmwd8cg8r00wntsxksrala040	cmwd8cg8100qwtsxkkntno165	NET_OUT	19.4	MB/s	\N	2026-11-11 14:40:59.153	2026-11-12 07:32:02.996
cmwd8cg8r00wotsxk7ole2j46	cmwd8cg8100qwtsxkkntno165	NET_OUT	21.4	MB/s	\N	2026-11-11 15:11:37.451	2026-11-12 07:32:02.996
cmwd8cg8r00wptsxkikm2cdue	cmwd8cg8100qwtsxkkntno165	NET_OUT	23.9	MB/s	\N	2026-11-11 15:42:15.748	2026-11-12 07:32:02.996
cmwd8cg8r00wqtsxktnp8p39s	cmwd8cg8100qwtsxkkntno165	NET_OUT	22.6	MB/s	\N	2026-11-11 16:12:54.046	2026-11-12 07:32:02.996
cmwd8cg8r00wrtsxkj5gw4170	cmwd8cg8100qwtsxkkntno165	NET_OUT	25.9	MB/s	\N	2026-11-11 16:43:32.344	2026-11-12 07:32:02.996
cmwd8cg8r00wstsxkg25p92p3	cmwd8cg8100qwtsxkkntno165	NET_OUT	25	MB/s	\N	2026-11-11 17:14:10.642	2026-11-12 07:32:02.996
cmwd8cg8r00wttsxk6j901r95	cmwd8cg8100qwtsxkkntno165	NET_OUT	28.4	MB/s	\N	2026-11-11 17:44:48.94	2026-11-12 07:32:02.996
cmwd8cg8r00wutsxk8uwxo2kc	cmwd8cg8100qwtsxkkntno165	NET_OUT	27.4	MB/s	\N	2026-11-11 18:15:27.238	2026-11-12 07:32:02.996
cmwd8cg8r00wvtsxkdhvor5m1	cmwd8cg8100qwtsxkkntno165	NET_OUT	30.2	MB/s	\N	2026-11-11 18:46:05.536	2026-11-12 07:32:02.996
cmwd8cg8r00wwtsxke0ezquqz	cmwd8cg8100qwtsxkkntno165	NET_OUT	32.5	MB/s	\N	2026-11-11 19:16:43.834	2026-11-12 07:32:02.996
cmwd8cg8r00wxtsxkbp13epkm	cmwd8cg8100qwtsxkkntno165	NET_OUT	30.1	MB/s	\N	2026-11-11 19:47:22.131	2026-11-12 07:32:02.996
cmwd8cg8r00wytsxk8sfnydcc	cmwd8cg8100qwtsxkkntno165	NET_OUT	31.5	MB/s	\N	2026-11-11 20:18:00.429	2026-11-12 07:32:02.996
cmwd8cg8r00wztsxkzw7d8dk6	cmwd8cg8100qwtsxkkntno165	NET_OUT	28.1	MB/s	\N	2026-11-11 20:48:38.727	2026-11-12 07:32:02.996
cmwd8cg8r00x0tsxkg2hua1cj	cmwd8cg8100qwtsxkkntno165	NET_OUT	28.6	MB/s	\N	2026-11-11 21:19:17.025	2026-11-12 07:32:02.996
cmwd8cg8r00x1tsxk1o3ieeum	cmwd8cg8100qwtsxkkntno165	NET_OUT	24.6	MB/s	\N	2026-11-11 21:49:55.323	2026-11-12 07:32:02.996
cmwd8cg8r00x2tsxk7a2ywrxz	cmwd8cg8100qwtsxkkntno165	NET_OUT	24.9	MB/s	\N	2026-11-11 22:20:33.621	2026-11-12 07:32:02.996
cmwd8cg8r00x3tsxkn5pg4t6w	cmwd8cg8100qwtsxkkntno165	NET_OUT	25.2	MB/s	\N	2026-11-11 22:51:11.919	2026-11-12 07:32:02.996
cmwd8cg8r00x4tsxk6tc6jje6	cmwd8cg8100qwtsxkkntno165	NET_OUT	21.6	MB/s	\N	2026-11-11 23:21:50.217	2026-11-12 07:32:02.996
cmwd8cg8r00x5tsxk15inx8up	cmwd8cg8100qwtsxkkntno165	NET_OUT	22.7	MB/s	\N	2026-11-11 23:52:28.514	2026-11-12 07:32:02.996
cmwd8cg8r00x6tsxkcuzbb6er	cmwd8cg8100qwtsxkkntno165	NET_OUT	20	MB/s	\N	2026-11-12 00:23:06.812	2026-11-12 07:32:02.996
cmwd8cg8r00x7tsxkru5z96j8	cmwd8cg8100qwtsxkkntno165	NET_OUT	22.1	MB/s	\N	2026-11-12 00:53:45.11	2026-11-12 07:32:02.996
cmwd8cg8r00x8tsxk2w0ek0bz	cmwd8cg8100qwtsxkkntno165	NET_OUT	20.4	MB/s	\N	2026-11-12 01:24:23.408	2026-11-12 07:32:02.996
cmwd8cg8r00x9tsxk14clzbnx	cmwd8cg8100qwtsxkkntno165	NET_OUT	23.4	MB/s	\N	2026-11-12 01:55:01.706	2026-11-12 07:32:02.996
cmwd8cg8r00xatsxk5gup6a3o	cmwd8cg8100qwtsxkkntno165	NET_OUT	26.7	MB/s	\N	2026-11-12 02:25:40.004	2026-11-12 07:32:02.996
cmwd8cg8r00xbtsxkcvwdx4hc	cmwd8cg8100qwtsxkkntno165	NET_OUT	25.9	MB/s	\N	2026-11-12 02:56:18.302	2026-11-12 07:32:02.996
cmwd8cg8s00xctsxkvxn1lvwm	cmwd8cg8100qwtsxkkntno165	NET_OUT	29.2	MB/s	\N	2026-11-12 03:26:56.6	2026-11-12 07:32:02.996
cmwd8cg8s00xdtsxkel6dnyaf	cmwd8cg8100qwtsxkkntno165	NET_OUT	28.1	MB/s	\N	2026-11-12 03:57:34.897	2026-11-12 07:32:02.996
cmwd8cg8s00xetsxk5xyw4sp4	cmwd8cg8100qwtsxkkntno165	NET_OUT	30.9	MB/s	\N	2026-11-12 04:28:13.195	2026-11-12 07:32:02.996
cmwd8cg8s00xftsxkf7cimr4s	cmwd8cg8100qwtsxkkntno165	NET_OUT	29	MB/s	\N	2026-11-12 04:58:51.493	2026-11-12 07:32:02.996
cmwd8cg8s00xgtsxkn83gg63a	cmwd8cg8100qwtsxkkntno165	NET_OUT	30.7	MB/s	\N	2026-11-12 05:29:29.791	2026-11-12 07:32:02.996
cmwd8cg8s00xhtsxkw8cvsf8f	cmwd8cg8100qwtsxkkntno165	NET_OUT	31.9	MB/s	\N	2026-11-12 06:00:08.089	2026-11-12 07:32:02.996
cmwd8cg8s00xitsxkfjfje6dd	cmwd8cg8100qwtsxkkntno165	NET_OUT	28.5	MB/s	\N	2026-11-12 06:30:46.387	2026-11-12 07:32:02.996
cmwd8cg8s00xjtsxka0skmad2	cmwd8cg8100qwtsxkkntno165	NET_OUT	29	MB/s	\N	2026-11-12 07:01:24.685	2026-11-12 07:32:02.996
cmwd8cg8s00xktsxkll49mz4v	cmwd8cg8100qwtsxkkntno165	NET_OUT	25	MB/s	\N	2026-11-12 07:32:02.983	2026-11-12 07:32:02.996
cmwd8cgbv00xmtsxk48870a7d	cmwd8cgbc00xltsxk8nrjqefz	CPU	16.2	%	\N	2026-11-11 07:32:03.099	2026-11-12 07:32:03.114
cmwd8cgbw00xntsxkiulefzyd	cmwd8cgbc00xltsxk8nrjqefz	CPU	19.6	%	\N	2026-11-11 08:02:41.396	2026-11-12 07:32:03.114
cmwd8cgbw00xotsxk21fa3ike	cmwd8cgbc00xltsxk8nrjqefz	CPU	22.9	%	\N	2026-11-11 08:33:19.694	2026-11-12 07:32:03.114
cmwd8cgbw00xptsxkgjh28jlc	cmwd8cgbc00xltsxk8nrjqefz	CPU	21.6	%	\N	2026-11-11 09:03:57.992	2026-11-12 07:32:03.114
cmwd8cgbw00xqtsxknyg9o01v	cmwd8cgbc00xltsxk8nrjqefz	CPU	24	%	\N	2026-11-11 09:34:36.29	2026-11-12 07:32:03.114
cmwd8cgbw00xrtsxk8n8pz0zr	cmwd8cgbc00xltsxk8nrjqefz	CPU	21.8	%	\N	2026-11-11 10:05:14.588	2026-11-12 07:32:03.114
cmwd8cgbw00xstsxkdf0dzxky	cmwd8cgbc00xltsxk8nrjqefz	CPU	23.2	%	\N	2026-11-11 10:35:52.886	2026-11-12 07:32:03.114
cmwd8cgbw00xttsxkahkowy6g	cmwd8cgbc00xltsxk8nrjqefz	CPU	20	%	\N	2026-11-11 11:06:31.184	2026-11-12 07:32:03.114
cmwd8cgbw00xutsxk4j7jcg8f	cmwd8cgbc00xltsxk8nrjqefz	CPU	20.5	%	\N	2026-11-11 11:37:09.481	2026-11-12 07:32:03.114
cmwd8cgbw00xvtsxk06e8ymzb	cmwd8cgbc00xltsxk8nrjqefz	CPU	20.9	%	\N	2026-11-11 12:07:47.779	2026-11-12 07:32:03.114
cmwd8cgbw00xwtsxkjooi26oe	cmwd8cgbc00xltsxk8nrjqefz	CPU	16.9	%	\N	2026-11-11 12:38:26.077	2026-11-12 07:32:03.114
cmwd8cgbw00xxtsxkacnoy8ne	cmwd8cgbc00xltsxk8nrjqefz	CPU	17.3	%	\N	2026-11-11 13:09:04.375	2026-11-12 07:32:03.114
cmwd8cgbw00xytsxkln13xbj0	cmwd8cgbc00xltsxk8nrjqefz	CPU	13.7	%	\N	2026-11-11 13:39:42.673	2026-11-12 07:32:03.114
cmwd8cgbw00xztsxk02qa71df	cmwd8cgbc00xltsxk8nrjqefz	CPU	14.7	%	\N	2026-11-11 14:10:20.971	2026-11-12 07:32:03.114
cmwd8cgbw00y0tsxkbxo2wj4i	cmwd8cgbc00xltsxk8nrjqefz	CPU	12	%	\N	2026-11-11 14:40:59.269	2026-11-12 07:32:03.114
cmwd8cgbw00y1tsxk0gg9dwws	cmwd8cgbc00xltsxk8nrjqefz	CPU	14	%	\N	2026-11-11 15:11:37.567	2026-11-12 07:32:03.114
cmwd8cgbw00y2tsxk6qnr6ql4	cmwd8cgbc00xltsxk8nrjqefz	CPU	16.6	%	\N	2026-11-11 15:42:15.864	2026-11-12 07:32:03.114
cmwd8cgbw00y3tsxkx57sbmlk	cmwd8cgbc00xltsxk8nrjqefz	CPU	15.3	%	\N	2026-11-11 16:12:54.162	2026-11-12 07:32:03.114
cmwd8cgbw00y4tsxkphldm7wx	cmwd8cgbc00xltsxk8nrjqefz	CPU	18.6	%	\N	2026-11-11 16:43:32.46	2026-11-12 07:32:03.114
cmwd8cgbw00y5tsxk32j09yfs	cmwd8cgbc00xltsxk8nrjqefz	CPU	17.8	%	\N	2026-11-11 17:14:10.758	2026-11-12 07:32:03.114
cmwd8cgbw00y6tsxk7lmtql1u	cmwd8cgbc00xltsxk8nrjqefz	CPU	21.2	%	\N	2026-11-11 17:44:49.056	2026-11-12 07:32:03.114
cmwd8cgbw00y7tsxkortnmn13	cmwd8cgbc00xltsxk8nrjqefz	CPU	20.2	%	\N	2026-11-11 18:15:27.354	2026-11-12 07:32:03.114
cmwd8cgbw00y8tsxklsgq88m6	cmwd8cgbc00xltsxk8nrjqefz	CPU	23.1	%	\N	2026-11-11 18:46:05.652	2026-11-12 07:32:03.114
cmwd8cgbw00y9tsxk1z5eoh3d	cmwd8cgbc00xltsxk8nrjqefz	CPU	25.5	%	\N	2026-11-11 19:16:43.95	2026-11-12 07:32:03.114
cmwd8cgbw00yatsxk7kz3az5j	cmwd8cgbc00xltsxk8nrjqefz	CPU	23.1	%	\N	2026-11-11 19:47:22.247	2026-11-12 07:32:03.114
cmwd8cgbw00ybtsxkmdu9rdrg	cmwd8cgbc00xltsxk8nrjqefz	CPU	24.5	%	\N	2026-11-11 20:18:00.545	2026-11-12 07:32:03.114
cmwd8cgbw00yctsxkaeop7ja0	cmwd8cgbc00xltsxk8nrjqefz	CPU	21.2	%	\N	2026-11-11 20:48:38.843	2026-11-12 07:32:03.114
cmwd8cgbw00ydtsxktc5xr5sw	cmwd8cgbc00xltsxk8nrjqefz	CPU	21.7	%	\N	2026-11-11 21:19:17.141	2026-11-12 07:32:03.114
cmwd8cgbw00yetsxk7ld2gzh5	cmwd8cgbc00xltsxk8nrjqefz	CPU	17.8	%	\N	2026-11-11 21:49:55.439	2026-11-12 07:32:03.114
cmwd8cgbw00yftsxk1zu1udgz	cmwd8cgbc00xltsxk8nrjqefz	CPU	18.1	%	\N	2026-11-11 22:20:33.737	2026-11-12 07:32:03.114
cmwd8cgbw00ygtsxkzzctftm8	cmwd8cgbc00xltsxk8nrjqefz	CPU	18.4	%	\N	2026-11-11 22:51:12.035	2026-11-12 07:32:03.114
cmwd8cgbw00yhtsxktn3v74n6	cmwd8cgbc00xltsxk8nrjqefz	CPU	14.9	%	\N	2026-11-11 23:21:50.333	2026-11-12 07:32:03.114
cmwd8cgbw00yitsxk5yvuwtvi	cmwd8cgbc00xltsxk8nrjqefz	CPU	16	%	\N	2026-11-11 23:52:28.63	2026-11-12 07:32:03.114
cmwd8cgbw00yjtsxkfy8ddcl7	cmwd8cgbc00xltsxk8nrjqefz	CPU	13.4	%	\N	2026-11-12 00:23:06.928	2026-11-12 07:32:03.114
cmwd8cgbw00yktsxkefq847xl	cmwd8cgbc00xltsxk8nrjqefz	CPU	15.5	%	\N	2026-11-12 00:53:45.226	2026-11-12 07:32:03.114
cmwd8cgbw00yltsxk0ctn3frq	cmwd8cgbc00xltsxk8nrjqefz	CPU	13.9	%	\N	2026-11-12 01:24:23.524	2026-11-12 07:32:03.114
cmwd8cgbw00ymtsxknw2ajdwn	cmwd8cgbc00xltsxk8nrjqefz	CPU	16.9	%	\N	2026-11-12 01:55:01.822	2026-11-12 07:32:03.114
cmwd8cgbw00yntsxkfmjxlbvz	cmwd8cgbc00xltsxk8nrjqefz	CPU	20.2	%	\N	2026-11-12 02:25:40.12	2026-11-12 07:32:03.114
cmwd8cgbx00yotsxk09yfmu72	cmwd8cgbc00xltsxk8nrjqefz	CPU	19.5	%	\N	2026-11-12 02:56:18.418	2026-11-12 07:32:03.114
cmwd8cgbx00yptsxky7r5wp9c	cmwd8cgbc00xltsxk8nrjqefz	CPU	22.8	%	\N	2026-11-12 03:26:56.716	2026-11-12 07:32:03.114
cmwd8cgbx00yqtsxkeutz9378	cmwd8cgbc00xltsxk8nrjqefz	CPU	21.8	%	\N	2026-11-12 03:57:35.013	2026-11-12 07:32:03.114
cmwd8cgbx00yrtsxktol8cg85	cmwd8cgbc00xltsxk8nrjqefz	CPU	24.6	%	\N	2026-11-12 04:28:13.311	2026-11-12 07:32:03.114
cmwd8cgbx00ystsxk68enoses	cmwd8cgbc00xltsxk8nrjqefz	CPU	22.7	%	\N	2026-11-12 04:58:51.609	2026-11-12 07:32:03.114
cmwd8cgbx00yttsxkg0dmdfrb	cmwd8cgbc00xltsxk8nrjqefz	CPU	24.5	%	\N	2026-11-12 05:29:29.907	2026-11-12 07:32:03.114
cmwd8cgbx00yutsxkc5jmitwr	cmwd8cgbc00xltsxk8nrjqefz	CPU	25.8	%	\N	2026-11-12 06:00:08.205	2026-11-12 07:32:03.114
cmwd8cgbx00yvtsxkmvjg20lz	cmwd8cgbc00xltsxk8nrjqefz	CPU	22.4	%	\N	2026-11-12 06:30:46.503	2026-11-12 07:32:03.114
cmwd8cgbx00ywtsxk6ky6x49d	cmwd8cgbc00xltsxk8nrjqefz	CPU	22.9	%	\N	2026-11-12 07:01:24.801	2026-11-12 07:32:03.114
cmwd8cgbx00yxtsxkuw357km8	cmwd8cgbc00xltsxk8nrjqefz	CPU	19	%	\N	2026-11-12 07:32:03.099	2026-11-12 07:32:03.114
cmwd8cgbx00yytsxkljuxt9a3	cmwd8cgbc00xltsxk8nrjqefz	MEM	34.2	%	\N	2026-11-11 07:32:03.1	2026-11-12 07:32:03.114
cmwd8cgbx00yztsxklbmhhfvf	cmwd8cgbc00xltsxk8nrjqefz	MEM	37.2	%	\N	2026-11-11 08:02:41.397	2026-11-12 07:32:03.114
cmwd8cgbx00z0tsxk3upbfe78	cmwd8cgbc00xltsxk8nrjqefz	MEM	40.1	%	\N	2026-11-11 08:33:19.695	2026-11-12 07:32:03.114
cmwd8cgbx00z1tsxkgz1c1pkk	cmwd8cgbc00xltsxk8nrjqefz	MEM	38.5	%	\N	2026-11-11 09:03:57.993	2026-11-12 07:32:03.114
cmwd8cgbx00z2tsxkxr3dnw59	cmwd8cgbc00xltsxk8nrjqefz	MEM	40.8	%	\N	2026-11-11 09:34:36.291	2026-11-12 07:32:03.114
cmwd8cgbx00z3tsxk24i2beyc	cmwd8cgbc00xltsxk8nrjqefz	MEM	38.5	%	\N	2026-11-11 10:05:14.589	2026-11-12 07:32:03.114
cmwd8cgbx00z4tsxkfiupi9hr	cmwd8cgbc00xltsxk8nrjqefz	MEM	40	%	\N	2026-11-11 10:35:52.887	2026-11-12 07:32:03.114
cmwd8cgbx00z5tsxkd57s69k8	cmwd8cgbc00xltsxk8nrjqefz	MEM	36.9	%	\N	2026-11-11 11:06:31.185	2026-11-12 07:32:03.114
cmwd8cgbx00z6tsxkksprtm7h	cmwd8cgbc00xltsxk8nrjqefz	MEM	37.8	%	\N	2026-11-11 11:37:09.482	2026-11-12 07:32:03.114
cmwd8cgbx00z7tsxkf0tqcf06	cmwd8cgbc00xltsxk8nrjqefz	MEM	38.5	%	\N	2026-11-11 12:07:47.78	2026-11-12 07:32:03.114
cmwd8cgbx00z8tsxklfszemu5	cmwd8cgbc00xltsxk8nrjqefz	MEM	34.9	%	\N	2026-11-11 12:38:26.078	2026-11-12 07:32:03.114
cmwd8cgbx00z9tsxk8un05sxe	cmwd8cgbc00xltsxk8nrjqefz	MEM	35.6	%	\N	2026-11-11 13:09:04.376	2026-11-12 07:32:03.114
cmwd8cgbx00zatsxkyjr32gxz	cmwd8cgbc00xltsxk8nrjqefz	MEM	32.3	%	\N	2026-11-11 13:39:42.674	2026-11-12 07:32:03.114
cmwd8cgbx00zbtsxkxpi55jnx	cmwd8cgbc00xltsxk8nrjqefz	MEM	33.5	%	\N	2026-11-11 14:10:20.972	2026-11-12 07:32:03.114
cmwd8cgbx00zctsxk09rxq7sm	cmwd8cgbc00xltsxk8nrjqefz	MEM	30.9	%	\N	2026-11-11 14:40:59.27	2026-11-12 07:32:03.114
cmwd8cgbx00zdtsxkb5bg8v9m	cmwd8cgbc00xltsxk8nrjqefz	MEM	32.9	%	\N	2026-11-11 15:11:37.568	2026-11-12 07:32:03.114
cmwd8cgbx00zetsxkoihs1adj	cmwd8cgbc00xltsxk8nrjqefz	MEM	35.2	%	\N	2026-11-11 15:42:15.865	2026-11-12 07:32:03.114
cmwd8cgbx00zftsxkw5wvy1lo	cmwd8cgbc00xltsxk8nrjqefz	MEM	33.7	%	\N	2026-11-11 16:12:54.163	2026-11-12 07:32:03.114
cmwd8cgbx00zgtsxkue0fn09u	cmwd8cgbc00xltsxk8nrjqefz	MEM	36.6	%	\N	2026-11-11 16:43:32.461	2026-11-12 07:32:03.114
cmwd8cgbx00zhtsxksrbf3eaa	cmwd8cgbc00xltsxk8nrjqefz	MEM	35.4	%	\N	2026-11-11 17:14:10.759	2026-11-12 07:32:03.114
cmwd8cgbx00zitsxkrdc09muq	cmwd8cgbc00xltsxk8nrjqefz	MEM	38.4	%	\N	2026-11-11 17:44:49.057	2026-11-12 07:32:03.114
cmwd8cgbx00zjtsxkv7cxgzh4	cmwd8cgbc00xltsxk8nrjqefz	MEM	37	%	\N	2026-11-11 18:15:27.355	2026-11-12 07:32:03.114
cmwd8cgbx00zktsxk4n5o1boz	cmwd8cgbc00xltsxk8nrjqefz	MEM	39.6	%	\N	2026-11-11 18:46:05.653	2026-11-12 07:32:03.114
cmwd8cgbx00zltsxkl1eoihqk	cmwd8cgbc00xltsxk8nrjqefz	MEM	41.8	%	\N	2026-11-11 19:16:43.951	2026-11-12 07:32:03.114
cmwd8cgbx00zmtsxkmzppkxzi	cmwd8cgbc00xltsxk8nrjqefz	MEM	39.5	%	\N	2026-11-11 19:47:22.248	2026-11-12 07:32:03.114
cmwd8cgbx00zntsxki1dhu58r	cmwd8cgbc00xltsxk8nrjqefz	MEM	40.9	%	\N	2026-11-11 20:18:00.546	2026-11-12 07:32:03.114
cmwd8cgbx00zotsxk5nalyh6h	cmwd8cgbc00xltsxk8nrjqefz	MEM	37.8	%	\N	2026-11-11 20:48:38.844	2026-11-12 07:32:03.114
cmwd8cgbx00zptsxk3ludicsr	cmwd8cgbc00xltsxk8nrjqefz	MEM	38.6	%	\N	2026-11-11 21:19:17.142	2026-11-12 07:32:03.114
cmwd8cgbx00zqtsxkvt83xylf	cmwd8cgbc00xltsxk8nrjqefz	MEM	35.1	%	\N	2026-11-11 21:49:55.44	2026-11-12 07:32:03.114
cmwd8cgbx00zrtsxk8lvsq8fy	cmwd8cgbc00xltsxk8nrjqefz	MEM	35.7	%	\N	2026-11-11 22:20:33.738	2026-11-12 07:32:03.114
cmwd8cgby00zstsxkya0pun3p	cmwd8cgbc00xltsxk8nrjqefz	MEM	36.5	%	\N	2026-11-11 22:51:12.036	2026-11-12 07:32:03.114
cmwd8cgby00zttsxkfj3ckomg	cmwd8cgbc00xltsxk8nrjqefz	MEM	33.2	%	\N	2026-11-11 23:21:50.334	2026-11-12 07:32:03.114
cmwd8cgby00zutsxkxxkrspdd	cmwd8cgbc00xltsxk8nrjqefz	MEM	34.5	%	\N	2026-11-11 23:52:28.631	2026-11-12 07:32:03.114
cmwd8cgby00zvtsxk7yqoo4wo	cmwd8cgbc00xltsxk8nrjqefz	MEM	31.9	%	\N	2026-11-12 00:23:06.929	2026-11-12 07:32:03.114
cmwd8cgby00zwtsxktg5ulm2v	cmwd8cgbc00xltsxk8nrjqefz	MEM	33.9	%	\N	2026-11-12 00:53:45.227	2026-11-12 07:32:03.114
cmwd8cgby00zxtsxk10ugacba	cmwd8cgbc00xltsxk8nrjqefz	MEM	32.1	%	\N	2026-11-12 01:24:23.525	2026-11-12 07:32:03.114
cmwd8cgby00zytsxkqxv7yt0m	cmwd8cgbc00xltsxk8nrjqefz	MEM	34.8	%	\N	2026-11-12 01:55:01.823	2026-11-12 07:32:03.114
cmwd8cgby00zztsxkby11g7bv	cmwd8cgbc00xltsxk8nrjqefz	MEM	37.7	%	\N	2026-11-12 02:25:40.121	2026-11-12 07:32:03.114
cmwd8cgby0100tsxk5l76cd3j	cmwd8cgbc00xltsxk8nrjqefz	MEM	36.6	%	\N	2026-11-12 02:56:18.419	2026-11-12 07:32:03.114
cmwd8cgby0101tsxkzzc8cyf1	cmwd8cgbc00xltsxk8nrjqefz	MEM	39.5	%	\N	2026-11-12 03:26:56.717	2026-11-12 07:32:03.114
cmwd8cgby0102tsxkocj2ftyk	cmwd8cgbc00xltsxk8nrjqefz	MEM	38.1	%	\N	2026-11-12 03:57:35.014	2026-11-12 07:32:03.114
cmwd8cgby0103tsxk824jxwk9	cmwd8cgbc00xltsxk8nrjqefz	MEM	40.7	%	\N	2026-11-12 04:28:13.312	2026-11-12 07:32:03.114
cmwd8cgby0104tsxkh2p01fu3	cmwd8cgbc00xltsxk8nrjqefz	MEM	38.6	%	\N	2026-11-12 04:58:51.61	2026-11-12 07:32:03.114
cmwd8cgby0105tsxkwbfv4bc1	cmwd8cgbc00xltsxk8nrjqefz	MEM	40.4	%	\N	2026-11-12 05:29:29.908	2026-11-12 07:32:03.114
cmwd8cgby0106tsxkqhxelfew	cmwd8cgbc00xltsxk8nrjqefz	MEM	41.8	%	\N	2026-11-12 06:00:08.206	2026-11-12 07:32:03.114
cmwd8cgby0107tsxk73sdsi3s	cmwd8cgbc00xltsxk8nrjqefz	MEM	38.7	%	\N	2026-11-12 06:30:46.504	2026-11-12 07:32:03.114
cmwd8cgby0108tsxkkvrlum5x	cmwd8cgbc00xltsxk8nrjqefz	MEM	39.5	%	\N	2026-11-12 07:01:24.802	2026-11-12 07:32:03.114
cmwd8cgby0109tsxklf78tpda	cmwd8cgbc00xltsxk8nrjqefz	MEM	35.9	%	\N	2026-11-12 07:32:03.1	2026-11-12 07:32:03.114
cmwd8cgby010atsxkdui6pfqh	cmwd8cgbc00xltsxk8nrjqefz	DISK	26.2	%	\N	2026-11-11 07:32:03.1	2026-11-12 07:32:03.114
cmwd8cgby010btsxkd0i1f996	cmwd8cgbc00xltsxk8nrjqefz	DISK	28.6	%	\N	2026-11-11 08:02:41.397	2026-11-12 07:32:03.114
cmwd8cgby010ctsxku4t8hbzd	cmwd8cgbc00xltsxk8nrjqefz	DISK	31	%	\N	2026-11-11 08:33:19.695	2026-11-12 07:32:03.114
cmwd8cgby010dtsxkb954u5m5	cmwd8cgbc00xltsxk8nrjqefz	DISK	29	%	\N	2026-11-11 09:03:57.993	2026-11-12 07:32:03.114
cmwd8cgby010etsxk4a5xnopb	cmwd8cgbc00xltsxk8nrjqefz	DISK	31	%	\N	2026-11-11 09:34:36.291	2026-11-12 07:32:03.114
cmwd8cgby010ftsxk0uya9yln	cmwd8cgbc00xltsxk8nrjqefz	DISK	28.7	%	\N	2026-11-11 10:05:14.589	2026-11-12 07:32:03.114
cmwd8cgby010gtsxkg7kzkxdv	cmwd8cgbc00xltsxk8nrjqefz	DISK	30.4	%	\N	2026-11-11 10:35:52.887	2026-11-12 07:32:03.114
cmwd8cgby010htsxk1xn53fzf	cmwd8cgbc00xltsxk8nrjqefz	DISK	27.6	%	\N	2026-11-11 11:06:31.185	2026-11-12 07:32:03.114
cmwd8cgby010itsxkym2ett5w	cmwd8cgbc00xltsxk8nrjqefz	DISK	29	%	\N	2026-11-11 11:37:09.482	2026-11-12 07:32:03.114
cmwd8cgby010jtsxkuqctylhv	cmwd8cgbc00xltsxk8nrjqefz	DISK	30.2	%	\N	2026-11-11 12:07:47.78	2026-11-12 07:32:03.114
cmwd8cgby010ktsxkyl3bt3ae	cmwd8cgbc00xltsxk8nrjqefz	DISK	27.3	%	\N	2026-11-11 12:38:26.078	2026-11-12 07:32:03.114
cmwd8cgby010ltsxkhdxmrqcc	cmwd8cgbc00xltsxk8nrjqefz	DISK	28.5	%	\N	2026-11-11 13:09:04.376	2026-11-12 07:32:03.114
cmwd8cgby010mtsxk4cwew9bj	cmwd8cgbc00xltsxk8nrjqefz	DISK	25.7	%	\N	2026-11-11 13:39:42.674	2026-11-12 07:32:03.114
cmwd8cgby010ntsxkfse1ny7z	cmwd8cgbc00xltsxk8nrjqefz	DISK	27.2	%	\N	2026-11-11 14:10:20.972	2026-11-12 07:32:03.114
cmwd8cgby010otsxkfa3ims94	cmwd8cgbc00xltsxk8nrjqefz	DISK	24.7	%	\N	2026-11-11 14:40:59.27	2026-11-12 07:32:03.114
cmwd8cgby010ptsxk1bdfoyzx	cmwd8cgbc00xltsxk8nrjqefz	DISK	26.6	%	\N	2026-11-11 15:11:37.568	2026-11-12 07:32:03.114
cmwd8cgby010qtsxkrzj5b22k	cmwd8cgbc00xltsxk8nrjqefz	DISK	28.7	%	\N	2026-11-11 15:42:15.865	2026-11-12 07:32:03.114
cmwd8cgby010rtsxkeicasi7b	cmwd8cgbc00xltsxk8nrjqefz	DISK	26.7	%	\N	2026-11-11 16:12:54.163	2026-11-12 07:32:03.114
cmwd8cgby010stsxkmpelyk87	cmwd8cgbc00xltsxk8nrjqefz	DISK	29.1	%	\N	2026-11-11 16:43:32.461	2026-11-12 07:32:03.114
cmwd8cgbz010ttsxkipft5ww5	cmwd8cgbc00xltsxk8nrjqefz	DISK	27.3	%	\N	2026-11-11 17:14:10.759	2026-11-12 07:32:03.114
cmwd8cgbz010utsxk28l4bhwz	cmwd8cgbc00xltsxk8nrjqefz	DISK	29.7	%	\N	2026-11-11 17:44:49.057	2026-11-12 07:32:03.114
cmwd8cgbz010vtsxkzanz0ask	cmwd8cgbc00xltsxk8nrjqefz	DISK	27.8	%	\N	2026-11-11 18:15:27.355	2026-11-12 07:32:03.114
cmwd8cgbz010wtsxkjysqcnno	cmwd8cgbc00xltsxk8nrjqefz	DISK	30	%	\N	2026-11-11 18:46:05.653	2026-11-12 07:32:03.114
cmwd8cgbz010xtsxkr91mtvyz	cmwd8cgbc00xltsxk8nrjqefz	DISK	32	%	\N	2026-11-11 19:16:43.951	2026-11-12 07:32:03.114
cmwd8cgbz010ytsxkmia83bn8	cmwd8cgbc00xltsxk8nrjqefz	DISK	29.7	%	\N	2026-11-11 19:47:22.248	2026-11-12 07:32:03.114
cmwd8cgbz010ztsxk9mnk8bbg	cmwd8cgbc00xltsxk8nrjqefz	DISK	31.3	%	\N	2026-11-11 20:18:00.546	2026-11-12 07:32:03.114
cmwd8cgbz0110tsxknf966vh5	cmwd8cgbc00xltsxk8nrjqefz	DISK	28.6	%	\N	2026-11-11 20:48:38.844	2026-11-12 07:32:03.114
cmwd8cgbz0111tsxkq15jw0l6	cmwd8cgbc00xltsxk8nrjqefz	DISK	29.9	%	\N	2026-11-11 21:19:17.142	2026-11-12 07:32:03.114
cmwd8cgbz0112tsxkbb42kk79	cmwd8cgbc00xltsxk8nrjqefz	DISK	26.9	%	\N	2026-11-11 21:49:55.44	2026-11-12 07:32:03.114
cmwd8cgbz0113tsxksdxcisfz	cmwd8cgbc00xltsxk8nrjqefz	DISK	28.2	%	\N	2026-11-11 22:20:33.738	2026-11-12 07:32:03.114
cmwd8cgbz0114tsxkx19e3yxb	cmwd8cgbc00xltsxk8nrjqefz	DISK	29.4	%	\N	2026-11-11 22:51:12.036	2026-11-12 07:32:03.114
cmwd8cgbz0115tsxk9321lgpu	cmwd8cgbc00xltsxk8nrjqefz	DISK	26.6	%	\N	2026-11-11 23:21:50.334	2026-11-12 07:32:03.114
cmwd8cgbz0116tsxkq406uzoz	cmwd8cgbc00xltsxk8nrjqefz	DISK	28.2	%	\N	2026-11-11 23:52:28.631	2026-11-12 07:32:03.114
cmwd8cgbz0117tsxkh3vtum3e	cmwd8cgbc00xltsxk8nrjqefz	DISK	25.7	%	\N	2026-11-12 00:23:06.929	2026-11-12 07:32:03.114
cmwd8cgbz0118tsxkcs6pxrwi	cmwd8cgbc00xltsxk8nrjqefz	DISK	27.6	%	\N	2026-11-12 00:53:45.227	2026-11-12 07:32:03.114
cmwd8cgbz0119tsxk4hvtu7dn	cmwd8cgbc00xltsxk8nrjqefz	DISK	25.5	%	\N	2026-11-12 01:24:23.525	2026-11-12 07:32:03.114
cmwd8cgbz011atsxk6caofmkl	cmwd8cgbc00xltsxk8nrjqefz	DISK	27.8	%	\N	2026-11-12 01:55:01.823	2026-11-12 07:32:03.114
cmwd8cgbz011btsxkgodccetj	cmwd8cgbc00xltsxk8nrjqefz	DISK	30.2	%	\N	2026-11-12 02:25:40.121	2026-11-12 07:32:03.114
cmwd8cgbz011ctsxkc253n5a3	cmwd8cgbc00xltsxk8nrjqefz	DISK	28.4	%	\N	2026-11-12 02:56:18.419	2026-11-12 07:32:03.114
cmwd8cgbz011dtsxkpfhps9gr	cmwd8cgbc00xltsxk8nrjqefz	DISK	30.8	%	\N	2026-11-12 03:26:56.717	2026-11-12 07:32:03.114
cmwd8cgbz011etsxk7tckhxr8	cmwd8cgbc00xltsxk8nrjqefz	DISK	28.9	%	\N	2026-11-12 03:57:35.014	2026-11-12 07:32:03.114
cmwd8cgbz011ftsxk58rodp6x	cmwd8cgbc00xltsxk8nrjqefz	DISK	31.1	%	\N	2026-11-12 04:28:13.312	2026-11-12 07:32:03.114
cmwd8cgbz011gtsxkgo25mj0e	cmwd8cgbc00xltsxk8nrjqefz	DISK	28.9	%	\N	2026-11-12 04:58:51.61	2026-11-12 07:32:03.114
cmwd8cgbz011htsxkqrl5xvyt	cmwd8cgbc00xltsxk8nrjqefz	DISK	30.7	%	\N	2026-11-12 05:29:29.908	2026-11-12 07:32:03.114
cmwd8cgbz011itsxk5h9np5iq	cmwd8cgbc00xltsxk8nrjqefz	DISK	32.3	%	\N	2026-11-12 06:00:08.206	2026-11-12 07:32:03.114
cmwd8cgbz011jtsxk2i5rbfpl	cmwd8cgbc00xltsxk8nrjqefz	DISK	29.5	%	\N	2026-11-12 06:30:46.504	2026-11-12 07:32:03.114
cmwd8cgbz011ktsxkkcn498o0	cmwd8cgbc00xltsxk8nrjqefz	DISK	30.8	%	\N	2026-11-12 07:01:24.802	2026-11-12 07:32:03.114
cmwd8cgbz011ltsxk4qmkhhnd	cmwd8cgbc00xltsxk8nrjqefz	DISK	27.9	%	\N	2026-11-12 07:32:03.1	2026-11-12 07:32:03.114
cmwd8cgbz011mtsxk4mt0wk6a	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	21.8	MB/s	\N	2026-11-11 07:32:03.1	2026-11-12 07:32:03.114
cmwd8cgbz011ntsxk2bxhiw1d	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	25.6	MB/s	\N	2026-11-11 08:02:41.397	2026-11-12 07:32:03.114
cmwd8cgbz011otsxkj96871r0	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	29.1	MB/s	\N	2026-11-11 08:33:19.695	2026-11-12 07:32:03.114
cmwd8cgbz011ptsxk65t601ct	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	28	MB/s	\N	2026-11-11 09:03:57.993	2026-11-12 07:32:03.114
cmwd8cgbz011qtsxk1nyqxlk4	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	30.6	MB/s	\N	2026-11-11 09:34:36.291	2026-11-12 07:32:03.114
cmwd8cgbz011rtsxklpp42pke	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	28.4	MB/s	\N	2026-11-11 10:05:14.589	2026-11-12 07:32:03.114
cmwd8cgbz011stsxk702ow2tl	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	29.7	MB/s	\N	2026-11-11 10:35:52.887	2026-11-12 07:32:03.114
cmwd8cgbz011ttsxk3rvo96qk	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	26.1	MB/s	\N	2026-11-11 11:06:31.185	2026-11-12 07:32:03.114
cmwd8cgbz011utsxkzx3rxbep	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	26.3	MB/s	\N	2026-11-11 11:37:09.482	2026-11-12 07:32:03.114
cmwd8cgc0011vtsxkrqrv95b1	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	26.2	MB/s	\N	2026-11-11 12:07:47.78	2026-11-12 07:32:03.114
cmwd8cgc0011wtsxkvf50osi4	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	21.9	MB/s	\N	2026-11-11 12:38:26.078	2026-11-12 07:32:03.114
cmwd8cgc0011xtsxklhog3ekm	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	21.8	MB/s	\N	2026-11-11 13:09:04.376	2026-11-12 07:32:03.114
cmwd8cgc0011ytsxkiwsbm4ny	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	17.9	MB/s	\N	2026-11-11 13:39:42.674	2026-11-12 07:32:03.114
cmwd8cgc0011ztsxk0dflkmth	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	18.6	MB/s	\N	2026-11-11 14:10:20.972	2026-11-12 07:32:03.114
cmwd8cgc00120tsxkjlkjwb5f	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	15.8	MB/s	\N	2026-11-11 14:40:59.27	2026-11-12 07:32:03.114
cmwd8cgc00121tsxkdfq7skpi	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	17.8	MB/s	\N	2026-11-11 15:11:37.568	2026-11-12 07:32:03.114
cmwd8cgc00122tsxkseq5725v	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	20.5	MB/s	\N	2026-11-11 15:42:15.865	2026-11-12 07:32:03.114
cmwd8cgc00123tsxksv9x9hxb	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	19.5	MB/s	\N	2026-11-11 16:12:54.163	2026-11-12 07:32:03.114
cmwd8cgc00124tsxku8cqihs4	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	23.1	MB/s	\N	2026-11-11 16:43:32.461	2026-11-12 07:32:03.114
cmwd8cgc00125tsxkegukrp1v	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	22.7	MB/s	\N	2026-11-11 17:14:10.759	2026-11-12 07:32:03.114
cmwd8cgc00126tsxkvivnzeyd	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	26.4	MB/s	\N	2026-11-11 17:44:49.057	2026-11-12 07:32:03.114
cmwd8cgc00127tsxka73s8g3f	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	25.7	MB/s	\N	2026-11-11 18:15:27.355	2026-11-12 07:32:03.114
cmwd8cgc00128tsxkvnj170b4	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	28.8	MB/s	\N	2026-11-11 18:46:05.653	2026-11-12 07:32:03.114
cmwd8cgc00129tsxkq67jafo3	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	31.3	MB/s	\N	2026-11-11 19:16:43.951	2026-11-12 07:32:03.114
cmwd8cgc0012atsxkm6iq2z0j	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	28.9	MB/s	\N	2026-11-11 19:47:22.248	2026-11-12 07:32:03.114
cmwd8cgc0012btsxk2pcrdmbq	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	30.1	MB/s	\N	2026-11-11 20:18:00.546	2026-11-12 07:32:03.114
cmwd8cgc0012ctsxkn4sd3qsk	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	26.5	MB/s	\N	2026-11-11 20:48:38.844	2026-11-12 07:32:03.114
cmwd8cgc0012dtsxkxa0zpj6e	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	26.7	MB/s	\N	2026-11-11 21:19:17.142	2026-11-12 07:32:03.114
cmwd8cgc0012etsxkhdvpeytn	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	22.3	MB/s	\N	2026-11-11 21:49:55.44	2026-11-12 07:32:03.114
cmwd8cgc0012ftsxkgm6psqbk	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	22.2	MB/s	\N	2026-11-11 22:20:33.738	2026-11-12 07:32:03.114
cmwd8cgc0012gtsxkqeioge67	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	22.1	MB/s	\N	2026-11-11 22:51:12.036	2026-11-12 07:32:03.114
cmwd8cgc0012htsxk1p4ondd9	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	18.3	MB/s	\N	2026-11-11 23:21:50.334	2026-11-12 07:32:03.114
cmwd8cgc0012itsxk6n97iz6e	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	19.1	MB/s	\N	2026-11-11 23:52:28.631	2026-11-12 07:32:03.114
cmwd8cgc0012jtsxk4j4rl9y1	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	16.4	MB/s	\N	2026-11-12 00:23:06.929	2026-11-12 07:32:03.114
cmwd8cgc0012ktsxk1e3v7fkn	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	18.5	MB/s	\N	2026-11-12 00:53:45.227	2026-11-12 07:32:03.114
cmwd8cgc0012ltsxkw3lqk9af	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	17.1	MB/s	\N	2026-11-12 01:24:23.525	2026-11-12 07:32:03.114
cmwd8cgc0012mtsxk09zabg8c	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	20.4	MB/s	\N	2026-11-12 01:55:01.823	2026-11-12 07:32:03.114
cmwd8cgc0012ntsxk24v9taln	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	24	MB/s	\N	2026-11-12 02:25:40.121	2026-11-12 07:32:03.114
cmwd8cgc0012otsxkpsdffx1r	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	23.6	MB/s	\N	2026-11-12 02:56:18.419	2026-11-12 07:32:03.114
cmwd8cgc0012ptsxk1qck2r08	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	27.3	MB/s	\N	2026-11-12 03:26:56.717	2026-11-12 07:32:03.114
cmwd8cgc0012qtsxke647o3c6	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	26.6	MB/s	\N	2026-11-12 03:57:35.014	2026-11-12 07:32:03.114
cmwd8cgc0012rtsxkgn28piuh	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	29.5	MB/s	\N	2026-11-12 04:28:13.312	2026-11-12 07:32:03.114
cmwd8cgc0012stsxk3gi7zbtq	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	27.7	MB/s	\N	2026-11-12 04:58:51.61	2026-11-12 07:32:03.114
cmwd8cgc0012ttsxkmevm4xqu	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	29.5	MB/s	\N	2026-11-12 05:29:29.908	2026-11-12 07:32:03.114
cmwd8cgc0012utsxkq7251kxo	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	30.6	MB/s	\N	2026-11-12 06:00:08.206	2026-11-12 07:32:03.114
cmwd8cgc0012vtsxk494lkzgi	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	26.9	MB/s	\N	2026-11-12 06:30:46.504	2026-11-12 07:32:03.114
cmwd8cgc0012wtsxk91lvjrl6	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	27	MB/s	\N	2026-11-12 07:01:24.802	2026-11-12 07:32:03.114
cmwd8cgc1012xtsxk3b0ekpgp	cmwd8cgbc00xltsxk8nrjqefz	NET_IN	22.6	MB/s	\N	2026-11-12 07:32:03.1	2026-11-12 07:32:03.114
cmwd8cgc1012ytsxkf4j0nyba	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	16.2	MB/s	\N	2026-11-11 07:32:03.1	2026-11-12 07:32:03.114
cmwd8cgc1012ztsxk9nv499ny	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	19.6	MB/s	\N	2026-11-11 08:02:41.397	2026-11-12 07:32:03.114
cmwd8cgc10130tsxk5ae4vu84	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	22.8	MB/s	\N	2026-11-11 08:33:19.695	2026-11-12 07:32:03.114
cmwd8cgc10131tsxkc4pesi5e	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	21.4	MB/s	\N	2026-11-11 09:03:57.993	2026-11-12 07:32:03.114
cmwd8cgc10132tsxkxt4l546x	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	23.9	MB/s	\N	2026-11-11 09:34:36.291	2026-11-12 07:32:03.114
cmwd8cgc10133tsxkruwynrgc	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	21.6	MB/s	\N	2026-11-11 10:05:14.589	2026-11-12 07:32:03.114
cmwd8cgc10134tsxksaiu0ffp	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	23	MB/s	\N	2026-11-11 10:35:52.887	2026-11-12 07:32:03.114
cmwd8cgc10135tsxk1gq5brwr	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	19.7	MB/s	\N	2026-11-11 11:06:31.185	2026-11-12 07:32:03.114
cmwd8cgc10136tsxkuk38o70j	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	20.2	MB/s	\N	2026-11-11 11:37:09.482	2026-11-12 07:32:03.114
cmwd8cgc10137tsxkf01bm0s3	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	20.5	MB/s	\N	2026-11-11 12:07:47.78	2026-11-12 07:32:03.114
cmwd8cgc10138tsxk008a96rd	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	16.5	MB/s	\N	2026-11-11 12:38:26.078	2026-11-12 07:32:03.114
cmwd8cgc10139tsxkesd5g7su	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	16.8	MB/s	\N	2026-11-11 13:09:04.376	2026-11-12 07:32:03.114
cmwd8cgc1013atsxk8al63sfb	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	13.2	MB/s	\N	2026-11-11 13:39:42.674	2026-11-12 07:32:03.114
cmwd8cgc1013btsxka5z06ecc	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	14.1	MB/s	\N	2026-11-11 14:10:20.972	2026-11-12 07:32:03.114
cmwd8cgc1013ctsxkp0ndog9h	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	11.4	MB/s	\N	2026-11-11 14:40:59.27	2026-11-12 07:32:03.114
cmwd8cgc1013dtsxkzjwyusrq	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	13.4	MB/s	\N	2026-11-11 15:11:37.568	2026-11-12 07:32:03.114
cmwd8cgc1013etsxk5ddma5rw	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	15.9	MB/s	\N	2026-11-11 15:42:15.865	2026-11-12 07:32:03.114
cmwd8cgc1013ftsxkythtkvme	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	14.6	MB/s	\N	2026-11-11 16:12:54.163	2026-11-12 07:32:03.114
cmwd8cgc1013gtsxk9nv0mw1u	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	17.9	MB/s	\N	2026-11-11 16:43:32.461	2026-11-12 07:32:03.114
cmwd8cgc1013htsxkwrhk3810	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	17	MB/s	\N	2026-11-11 17:14:10.759	2026-11-12 07:32:03.114
cmwd8cgc1013itsxkqkw8pljc	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	20.4	MB/s	\N	2026-11-11 17:44:49.057	2026-11-12 07:32:03.114
cmwd8cgc1013jtsxkwyzd2v7m	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	19.4	MB/s	\N	2026-11-11 18:15:27.355	2026-11-12 07:32:03.114
cmwd8cgc1013ktsxkzgmqt41s	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	22.2	MB/s	\N	2026-11-11 18:46:05.653	2026-11-12 07:32:03.114
cmwd8cgc1013ltsxkygfbc8q2	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	24.5	MB/s	\N	2026-11-11 19:16:43.951	2026-11-12 07:32:03.114
cmwd8cgc1013mtsxk8toco8n9	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	22.1	MB/s	\N	2026-11-11 19:47:22.248	2026-11-12 07:32:03.114
cmwd8cgc1013ntsxk6ol2k0ez	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	23.5	MB/s	\N	2026-11-11 20:18:00.546	2026-11-12 07:32:03.114
cmwd8cgc1013otsxkixqg52zm	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	20.1	MB/s	\N	2026-11-11 20:48:38.844	2026-11-12 07:32:03.114
cmwd8cgc1013ptsxk4yxfef1n	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	20.6	MB/s	\N	2026-11-11 21:19:17.142	2026-11-12 07:32:03.114
cmwd8cgc1013qtsxklrvfwqfi	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	16.6	MB/s	\N	2026-11-11 21:49:55.44	2026-11-12 07:32:03.114
cmwd8cgc1013rtsxkojsrkwte	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	16.9	MB/s	\N	2026-11-11 22:20:33.738	2026-11-12 07:32:03.114
cmwd8cgc1013stsxkkpqdzoz0	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	17.2	MB/s	\N	2026-11-11 22:51:12.036	2026-11-12 07:32:03.114
cmwd8cgc1013ttsxka32ll2et	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	13.6	MB/s	\N	2026-11-11 23:21:50.334	2026-11-12 07:32:03.114
cmwd8cgc1013utsxkh4tcmbdw	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	14.7	MB/s	\N	2026-11-11 23:52:28.631	2026-11-12 07:32:03.114
cmwd8cgc1013vtsxk3yd1btza	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	12	MB/s	\N	2026-11-12 00:23:06.929	2026-11-12 07:32:03.114
cmwd8cgc1013wtsxkii77672u	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	14.1	MB/s	\N	2026-11-12 00:53:45.227	2026-11-12 07:32:03.114
cmwd8cgc1013xtsxkh8chozdz	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	12.4	MB/s	\N	2026-11-12 01:24:23.525	2026-11-12 07:32:03.114
cmwd8cgc1013ytsxky6lx942n	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	15.4	MB/s	\N	2026-11-12 01:55:01.823	2026-11-12 07:32:03.114
cmwd8cgc1013ztsxk8ty6ph30	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	18.7	MB/s	\N	2026-11-12 02:25:40.121	2026-11-12 07:32:03.114
cmwd8cgc20140tsxk0w33mv0w	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	17.9	MB/s	\N	2026-11-12 02:56:18.419	2026-11-12 07:32:03.114
cmwd8cgc20141tsxkngskgs4i	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	21.2	MB/s	\N	2026-11-12 03:26:56.717	2026-11-12 07:32:03.114
cmwd8cgc20142tsxkqzw8sgfp	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	20.1	MB/s	\N	2026-11-12 03:57:35.014	2026-11-12 07:32:03.114
cmwd8cgc20143tsxk68cig4lo	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	22.9	MB/s	\N	2026-11-12 04:28:13.312	2026-11-12 07:32:03.114
cmwd8cgc20144tsxk8z5iejyj	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	21	MB/s	\N	2026-11-12 04:58:51.61	2026-11-12 07:32:03.114
cmwd8cgc20145tsxk0ikdee0p	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	22.7	MB/s	\N	2026-11-12 05:29:29.908	2026-11-12 07:32:03.114
cmwd8cgc20146tsxkmyq21s6w	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	23.9	MB/s	\N	2026-11-12 06:00:08.206	2026-11-12 07:32:03.114
cmwd8cgc20147tsxkr1scxyx3	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	20.5	MB/s	\N	2026-11-12 06:30:46.504	2026-11-12 07:32:03.114
cmwd8cgc20148tsxk7liaxkrq	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	21	MB/s	\N	2026-11-12 07:01:24.802	2026-11-12 07:32:03.114
cmwd8cgc20149tsxkeg06acre	cmwd8cgbc00xltsxk8nrjqefz	NET_OUT	17	MB/s	\N	2026-11-12 07:32:03.1	2026-11-12 07:32:03.114
cmwdfjiv90002tsxgbw9l2jop	cmwdfjggi0000tsxgkxaw39yv	CPU	0.3666495141315482	%	{"metric": "CPUUtilization", "source": "cloudwatch", "statistic": "Average"}	2026-11-12 10:48:00	2026-11-12 10:53:30.309
cmwdfjivn0004tsxg8llj1cvx	cmwdfjggi0000tsxgkxaw39yv	CPU	0.3315622921191309	%	{"metric": "CPUUtilization", "source": "cloudwatch", "statistic": "Average"}	2026-11-12 10:43:00	2026-11-12 10:53:30.324
cmwdfjivs0006tsxg422uhwii	cmwdfjggi0000tsxgkxaw39yv	CPU	0.3551767205987319	%	{"metric": "CPUUtilization", "source": "cloudwatch", "statistic": "Average"}	2026-11-12 10:38:00	2026-11-12 10:53:30.329
cmwdfjj450008tsxgbtnmwqur	cmwdfjggi0000tsxgkxaw39yv	NET_IN	592	Bytes / 5 min	{"metric": "NetworkIn", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:48:00	2026-11-12 10:53:30.63
cmwdfjj4c000atsxgu8hj6muq	cmwdfjggi0000tsxgkxaw39yv	NET_IN	8385	Bytes / 5 min	{"metric": "NetworkIn", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:38:00	2026-11-12 10:53:30.636
cmwdfjj4h000ctsxgorz5f25i	cmwdfjggi0000tsxgkxaw39yv	NET_IN	1698	Bytes / 5 min	{"metric": "NetworkIn", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:43:00	2026-11-12 10:53:30.641
cmwdfjjck000etsxgm49nyjcj	cmwdfjggi0000tsxgkxaw39yv	NET_OUT	1464	Bytes / 5 min	{"metric": "NetworkOut", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:48:00	2026-11-12 10:53:30.932
cmwdfjjcp000gtsxgpx4jj1gr	cmwdfjggi0000tsxgkxaw39yv	NET_OUT	7352	Bytes / 5 min	{"metric": "NetworkOut", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:38:00	2026-11-12 10:53:30.937
cmwdfjjcu000itsxgij3a7lhw	cmwdfjggi0000tsxgkxaw39yv	NET_OUT	1823	Bytes / 5 min	{"metric": "NetworkOut", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:43:00	2026-11-12 10:53:30.942
cmwdfkthz000mtsxg69p4vswx	cmwdfjggi0000tsxgkxaw39yv	CPU	0.3315622921191309	%	{"metric": "CPUUtilization", "source": "cloudwatch", "statistic": "Average"}	2026-11-12 10:44:00	2026-11-12 10:54:30.744
cmwdfktii000otsxgz618gzrg	cmwdfjggi0000tsxgkxaw39yv	CPU	0.3551767205987319	%	{"metric": "CPUUtilization", "source": "cloudwatch", "statistic": "Average"}	2026-11-12 10:39:00	2026-11-12 10:54:30.763
cmwdfktir000qtsxghq9jh7sr	cmwdfjggi0000tsxgkxaw39yv	CPU	0.3458157470245661	%	{"metric": "CPUUtilization", "source": "cloudwatch", "statistic": "Average"}	2026-11-12 10:49:00	2026-11-12 10:54:30.772
cmwdfktqn000stsxg6puuzofe	cmwdfjggi0000tsxgkxaw39yv	NET_IN	592	Bytes / 5 min	{"metric": "NetworkIn", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:49:00	2026-11-12 10:54:31.056
cmwdfktqx000utsxg6k52fggs	cmwdfjggi0000tsxgkxaw39yv	NET_IN	8385	Bytes / 5 min	{"metric": "NetworkIn", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:39:00	2026-11-12 10:54:31.065
cmwdfktr3000wtsxgijfqc30m	cmwdfjggi0000tsxgkxaw39yv	NET_IN	1698	Bytes / 5 min	{"metric": "NetworkIn", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:44:00	2026-11-12 10:54:31.071
cmwdfktz2000ytsxg8svcywrx	cmwdfjggi0000tsxgkxaw39yv	NET_OUT	1464	Bytes / 5 min	{"metric": "NetworkOut", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:49:00	2026-11-12 10:54:31.358
cmwdfktz90010tsxgebyrga3r	cmwdfjggi0000tsxgkxaw39yv	NET_OUT	7352	Bytes / 5 min	{"metric": "NetworkOut", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:39:00	2026-11-12 10:54:31.365
cmwdfktzf0012tsxg4ltk6ko5	cmwdfjggi0000tsxgkxaw39yv	NET_OUT	1823	Bytes / 5 min	{"metric": "NetworkOut", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:44:00	2026-11-12 10:54:31.372
cmwdftdnt0015tsxghktw8uyk	cmwdfjggi0000tsxgkxaw39yv	CPU	0.3550473401679824	%	{"metric": "CPUUtilization", "source": "cloudwatch", "statistic": "Average"}	2026-11-12 10:46:00	2026-11-12 11:01:10.122
cmwdftdo70017tsxgaftqzz08	cmwdfjggi0000tsxgkxaw39yv	CPU	0.4243775795499933	%	{"metric": "CPUUtilization", "source": "cloudwatch", "statistic": "Average"}	2026-11-12 10:56:00	2026-11-12 11:01:10.136
cmwdftdod0019tsxg4y29q4ja	cmwdfjggi0000tsxgkxaw39yv	CPU	0.3300117267103844	%	{"metric": "CPUUtilization", "source": "cloudwatch", "statistic": "Average"}	2026-11-12 10:51:00	2026-11-12 11:01:10.142
cmwdftdwp001btsxguwcrt45o	cmwdfjggi0000tsxgkxaw39yv	NET_IN	66	Bytes / 5 min	{"metric": "NetworkIn", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:56:00	2026-11-12 11:01:10.441
cmwdftdwz001dtsxgwg54vp16	cmwdfjggi0000tsxgkxaw39yv	NET_IN	592	Bytes / 5 min	{"metric": "NetworkIn", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:46:00	2026-11-12 11:01:10.452
cmwdftdx6001ftsxgl6mijngi	cmwdfjggi0000tsxgkxaw39yv	NET_IN	586	Bytes / 5 min	{"metric": "NetworkIn", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:51:00	2026-11-12 11:01:10.458
cmwdfte5h001htsxgm3yain4v	cmwdfjggi0000tsxgkxaw39yv	NET_OUT	322	Bytes / 5 min	{"metric": "NetworkOut", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:56:00	2026-11-12 11:01:10.757
cmwdfte5n001jtsxgs8yxrzia	cmwdfjggi0000tsxgkxaw39yv	NET_OUT	1464	Bytes / 5 min	{"metric": "NetworkOut", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:46:00	2026-11-12 11:01:10.763
cmwdfte5s001ltsxghkua7eb5	cmwdfjggi0000tsxgkxaw39yv	NET_OUT	1516	Bytes / 5 min	{"metric": "NetworkOut", "source": "cloudwatch", "statistic": "Sum"}	2026-11-12 10:51:00	2026-11-12 11:01:10.768
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."Notification" (id, "userId", channel, title, body, "readAt", meta, "createdAt") FROM stdin;
\.


--
-- Data for Name: RemediationAction; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."RemediationAction" (id, type, "targetType", "targetId", status, "requestedById", "approvedById", evidence, result, "createdAt", "executedAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."Role" (id, name, permissions, "createdAt", "updatedAt") FROM stdin;
cmwd8cf0x0000tsxki3394iwb	ADMIN	["*"]	2026-11-12 07:32:01.422	2026-11-12 07:32:01.422
cmwd8cf5t0001tsxkt75ibp55	VIEWER	["public:read"]	2026-11-12 07:32:01.601	2026-11-12 07:32:01.601
\.


--
-- Data for Name: Server; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."Server" (id, name, hostname, os, environment, region, provider, "ipAddress", status, "isDemo", "lastHeartbeatAt", "registeredAt", "createdAt", "updatedAt", "awsInstanceId", "awsState", "awsInstanceType", "awsAvailabilityZone", "awsLaunchTime", "awsSyncedAt", "publicIpAddress") FROM stdin;
cmwd8cfnr0004tsxk7ea7fsoi	Production API Server	api-prod-01	Ubuntu 22.04	production	us-east-1	AWS	\N	HEALTHY	t	2026-11-12 07:32:02.24	2026-11-12 07:32:02.248	2026-11-12 07:32:02.248	2026-11-12 07:32:02.248	\N	\N	\N	\N	\N	\N	\N
cmwd8cfv7006ttsxkqnhqaq7s	Database Server	db-prod-01	Ubuntu 22.04	production	us-east-1	AWS	\N	WARNING	t	2026-11-12 07:32:02.514	2026-11-12 07:32:02.516	2026-11-12 07:32:02.516	2026-11-12 07:32:02.516	\N	\N	\N	\N	\N	\N	\N
cmwd8cfyr00ditsxkig9uqeve	Staging Server	app-staging-01	Debian 12	staging	eu-west-1	AWS	\N	HEALTHY	t	2026-11-12 07:32:02.641	2026-11-12 07:32:02.643	2026-11-12 07:32:02.643	2026-11-12 07:32:02.643	\N	\N	\N	\N	\N	\N	\N
cmwd8cg1y00k7tsxky2xplb37	Docker Worker	worker-01	Ubuntu 24.04	production	us-west-2	VPS	\N	CRITICAL	t	2026-11-12 07:32:02.756	2026-11-12 07:32:02.758	2026-11-12 07:32:02.758	2026-11-12 07:32:02.758	\N	\N	\N	\N	\N	\N	\N
cmwd8cg8100qwtsxkkntno165	Payment API	pay-api-01	Ubuntu 22.04	production	us-east-1	AWS	\N	WARNING	t	2026-11-12 07:32:02.975	2026-11-12 07:32:02.977	2026-11-12 07:32:02.977	2026-11-12 07:32:02.977	\N	\N	\N	\N	\N	\N	\N
cmwd8cgbc00xltsxk8nrjqefz	Frontend Server	web-edge-01	Ubuntu 22.04	production	us-east-1	AWS	\N	HEALTHY	t	2026-11-12 07:32:03.094	2026-11-12 07:32:03.096	2026-11-12 07:32:03.096	2026-11-12 07:32:03.096	\N	\N	\N	\N	\N	\N	\N
cmwdfjggi0000tsxgkxaw39yv	portfolio	ip-172-31-42-166.ap-southeast-2.compute.internal	Linux/UNIX	\N	ap-southeast-2	AWS	172.31.42.166	HEALTHY	f	\N	2026-11-12 10:53:27.185	2026-11-12 10:53:27.185	2026-11-12 11:01:07.085	i-0192e3cad7309ddb4	running	t3.micro	ap-southeast-2b	2026-10-25 18:49:10	2026-11-12 11:01:07.083	\N
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public."User" (id, email, "passwordHash", name, "roleId", "isActive", "createdAt", "updatedAt") FROM stdin;
cmwd8cflr0003tsxkhfobpnha	admin@infrapulse.local	$2b$12$E.FAHT0zBmeg3dHA4qDpmOy9Edlp8yOjmUVzWhsikkJ2N61Kp0iou	InfraPulse Admin	cmwd8cf0x0000tsxki3394iwb	t	2026-11-12 07:32:02.174	2026-11-12 07:32:02.174
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: infrapulse
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
c4031c16-889b-407c-936a-fe7abc081e54	d3c75d6069f14e2ac1ba0ac396f3d846a707c0ae20e6c23f1abe71c388e04e1c	2026-11-12 06:33:15.436615+00	20261112063314_cloudwatch	\N	\N	2026-11-12 06:33:14.796803+00	1
74a87e55-8fda-4784-bc83-56ad006560f7	9ba9091d7d722313cc2e432aa968b501d363cbe66f87c0bee387de5e19a3b846	2026-11-12 10:45:51.050073+00	20261112080000_aws_instance_id	\N	\N	2026-11-12 10:45:51.009573+00	1
51e4a5a5-5228-412c-8b94-64fde73dcf92	14d45e77dbed9ffc0e2042ad7a323e8cfc201e6763474a5641e82acb89bb258e	2026-11-12 11:18:25.36266+00	20261112110000_aws_inventory	\N	\N	2026-11-12 11:18:25.297342+00	1
\.


--
-- Name: Agent Agent_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Agent"
    ADD CONSTRAINT "Agent_pkey" PRIMARY KEY (id);


--
-- Name: AlertRule AlertRule_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."AlertRule"
    ADD CONSTRAINT "AlertRule_pkey" PRIMARY KEY (id);


--
-- Name: Alert Alert_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Alert"
    ADD CONSTRAINT "Alert_pkey" PRIMARY KEY (id);


--
-- Name: Anomaly Anomaly_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Anomaly"
    ADD CONSTRAINT "Anomaly_pkey" PRIMARY KEY (id);


--
-- Name: ApiCheck ApiCheck_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."ApiCheck"
    ADD CONSTRAINT "ApiCheck_pkey" PRIMARY KEY (id);


--
-- Name: ApiMonitor ApiMonitor_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."ApiMonitor"
    ADD CONSTRAINT "ApiMonitor_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: AwsResource AwsResource_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."AwsResource"
    ADD CONSTRAINT "AwsResource_pkey" PRIMARY KEY (id);


--
-- Name: AwsSyncRun AwsSyncRun_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."AwsSyncRun"
    ADD CONSTRAINT "AwsSyncRun_pkey" PRIMARY KEY (id);


--
-- Name: Deployment Deployment_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Deployment"
    ADD CONSTRAINT "Deployment_pkey" PRIMARY KEY (id);


--
-- Name: DockerContainer DockerContainer_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."DockerContainer"
    ADD CONSTRAINT "DockerContainer_pkey" PRIMARY KEY (id);


--
-- Name: DomainMonitor DomainMonitor_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."DomainMonitor"
    ADD CONSTRAINT "DomainMonitor_pkey" PRIMARY KEY (id);


--
-- Name: IncidentAlert IncidentAlert_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."IncidentAlert"
    ADD CONSTRAINT "IncidentAlert_pkey" PRIMARY KEY ("incidentId", "alertId");


--
-- Name: IncidentEvent IncidentEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."IncidentEvent"
    ADD CONSTRAINT "IncidentEvent_pkey" PRIMARY KEY (id);


--
-- Name: Incident Incident_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Incident"
    ADD CONSTRAINT "Incident_pkey" PRIMARY KEY (id);


--
-- Name: InfrastructureCost InfrastructureCost_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."InfrastructureCost"
    ADD CONSTRAINT "InfrastructureCost_pkey" PRIMARY KEY (id);


--
-- Name: LogEntry LogEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."LogEntry"
    ADD CONSTRAINT "LogEntry_pkey" PRIMARY KEY (id);


--
-- Name: MetricSample MetricSample_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."MetricSample"
    ADD CONSTRAINT "MetricSample_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: RemediationAction RemediationAction_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."RemediationAction"
    ADD CONSTRAINT "RemediationAction_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: Server Server_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Server"
    ADD CONSTRAINT "Server_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Agent_serverId_key; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE UNIQUE INDEX "Agent_serverId_key" ON public."Agent" USING btree ("serverId");


--
-- Name: Agent_status_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "Agent_status_idx" ON public."Agent" USING btree (status);


--
-- Name: Agent_tokenPrefix_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "Agent_tokenPrefix_idx" ON public."Agent" USING btree ("tokenPrefix");


--
-- Name: AlertRule_enabled_metric_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "AlertRule_enabled_metric_idx" ON public."AlertRule" USING btree (enabled, metric);


--
-- Name: Alert_isDemo_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "Alert_isDemo_idx" ON public."Alert" USING btree ("isDemo");


--
-- Name: Alert_serverId_status_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "Alert_serverId_status_idx" ON public."Alert" USING btree ("serverId", status);


--
-- Name: Alert_status_severity_triggeredAt_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "Alert_status_severity_triggeredAt_idx" ON public."Alert" USING btree (status, severity, "triggeredAt");


--
-- Name: Anomaly_detectedAt_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "Anomaly_detectedAt_idx" ON public."Anomaly" USING btree ("detectedAt");


--
-- Name: Anomaly_isDemo_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "Anomaly_isDemo_idx" ON public."Anomaly" USING btree ("isDemo");


--
-- Name: ApiCheck_apiMonitorId_checkedAt_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "ApiCheck_apiMonitorId_checkedAt_idx" ON public."ApiCheck" USING btree ("apiMonitorId", "checkedAt");


--
-- Name: ApiMonitor_enabled_isDemo_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "ApiMonitor_enabled_isDemo_idx" ON public."ApiMonitor" USING btree (enabled, "isDemo");


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_resourceType_resourceId_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON public."AuditLog" USING btree ("resourceType", "resourceId");


--
-- Name: AwsResource_accountId_identity_key; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE UNIQUE INDEX "AwsResource_accountId_identity_key" ON public."AwsResource" USING btree ("accountId", identity);


--
-- Name: AwsResource_lastDiscoveredAt_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "AwsResource_lastDiscoveredAt_idx" ON public."AwsResource" USING btree ("lastDiscoveredAt");


--
-- Name: AwsResource_missingSince_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "AwsResource_missingSince_idx" ON public."AwsResource" USING btree ("missingSince");


--
-- Name: AwsResource_resourceType_status_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "AwsResource_resourceType_status_idx" ON public."AwsResource" USING btree ("resourceType", status);


--
-- Name: AwsResource_service_region_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "AwsResource_service_region_idx" ON public."AwsResource" USING btree (service, region);


--
-- Name: AwsSyncRun_startedAt_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "AwsSyncRun_startedAt_idx" ON public."AwsSyncRun" USING btree ("startedAt");


--
-- Name: AwsSyncRun_status_startedAt_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "AwsSyncRun_status_startedAt_idx" ON public."AwsSyncRun" USING btree (status, "startedAt");


--
-- Name: Deployment_appName_deployedAt_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "Deployment_appName_deployedAt_idx" ON public."Deployment" USING btree ("appName", "deployedAt");


--
-- Name: Deployment_isDemo_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "Deployment_isDemo_idx" ON public."Deployment" USING btree ("isDemo");


--
-- Name: DockerContainer_serverId_containerId_key; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE UNIQUE INDEX "DockerContainer_serverId_containerId_key" ON public."DockerContainer" USING btree ("serverId", "containerId");


--
-- Name: DockerContainer_serverId_state_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "DockerContainer_serverId_state_idx" ON public."DockerContainer" USING btree ("serverId", state);


--
-- Name: DomainMonitor_domain_key; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE UNIQUE INDEX "DomainMonitor_domain_key" ON public."DomainMonitor" USING btree (domain);


--
-- Name: DomainMonitor_isDemo_enabled_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "DomainMonitor_isDemo_enabled_idx" ON public."DomainMonitor" USING btree ("isDemo", enabled);


--
-- Name: IncidentEvent_incidentId_createdAt_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "IncidentEvent_incidentId_createdAt_idx" ON public."IncidentEvent" USING btree ("incidentId", "createdAt");


--
-- Name: Incident_isDemo_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "Incident_isDemo_idx" ON public."Incident" USING btree ("isDemo");


--
-- Name: Incident_publicId_key; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE UNIQUE INDEX "Incident_publicId_key" ON public."Incident" USING btree ("publicId");


--
-- Name: Incident_status_severity_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "Incident_status_severity_idx" ON public."Incident" USING btree (status, severity);


--
-- Name: InfrastructureCost_isDemo_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "InfrastructureCost_isDemo_idx" ON public."InfrastructureCost" USING btree ("isDemo");


--
-- Name: InfrastructureCost_periodStart_periodEnd_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "InfrastructureCost_periodStart_periodEnd_idx" ON public."InfrastructureCost" USING btree ("periodStart", "periodEnd");


--
-- Name: LogEntry_collectedAt_level_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "LogEntry_collectedAt_level_idx" ON public."LogEntry" USING btree ("collectedAt", level);


--
-- Name: LogEntry_isDemo_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "LogEntry_isDemo_idx" ON public."LogEntry" USING btree ("isDemo");


--
-- Name: LogEntry_serverId_collectedAt_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "LogEntry_serverId_collectedAt_idx" ON public."LogEntry" USING btree ("serverId", "collectedAt");


--
-- Name: MetricSample_collectedAt_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "MetricSample_collectedAt_idx" ON public."MetricSample" USING btree ("collectedAt");


--
-- Name: MetricSample_serverId_kind_collectedAt_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "MetricSample_serverId_kind_collectedAt_idx" ON public."MetricSample" USING btree ("serverId", kind, "collectedAt");


--
-- Name: Notification_userId_readAt_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "Notification_userId_readAt_idx" ON public."Notification" USING btree ("userId", "readAt");


--
-- Name: RemediationAction_status_createdAt_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "RemediationAction_status_createdAt_idx" ON public."RemediationAction" USING btree (status, "createdAt");


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: Server_awsInstanceId_key; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE UNIQUE INDEX "Server_awsInstanceId_key" ON public."Server" USING btree ("awsInstanceId");


--
-- Name: Server_isDemo_status_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "Server_isDemo_status_idx" ON public."Server" USING btree ("isDemo", status);


--
-- Name: Server_lastHeartbeatAt_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "Server_lastHeartbeatAt_idx" ON public."Server" USING btree ("lastHeartbeatAt");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_roleId_idx; Type: INDEX; Schema: public; Owner: infrapulse
--

CREATE INDEX "User_roleId_idx" ON public."User" USING btree ("roleId");


--
-- Name: Agent Agent_serverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Agent"
    ADD CONSTRAINT "Agent_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES public."Server"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AlertRule AlertRule_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."AlertRule"
    ADD CONSTRAINT "AlertRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Alert Alert_ackById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Alert"
    ADD CONSTRAINT "Alert_ackById_fkey" FOREIGN KEY ("ackById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Alert Alert_apiMonitorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Alert"
    ADD CONSTRAINT "Alert_apiMonitorId_fkey" FOREIGN KEY ("apiMonitorId") REFERENCES public."ApiMonitor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Alert Alert_ruleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Alert"
    ADD CONSTRAINT "Alert_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES public."AlertRule"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Alert Alert_serverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Alert"
    ADD CONSTRAINT "Alert_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES public."Server"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Anomaly Anomaly_apiMonitorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Anomaly"
    ADD CONSTRAINT "Anomaly_apiMonitorId_fkey" FOREIGN KEY ("apiMonitorId") REFERENCES public."ApiMonitor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Anomaly Anomaly_relatedIncidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Anomaly"
    ADD CONSTRAINT "Anomaly_relatedIncidentId_fkey" FOREIGN KEY ("relatedIncidentId") REFERENCES public."Incident"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Anomaly Anomaly_serverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Anomaly"
    ADD CONSTRAINT "Anomaly_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES public."Server"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ApiCheck ApiCheck_apiMonitorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."ApiCheck"
    ADD CONSTRAINT "ApiCheck_apiMonitorId_fkey" FOREIGN KEY ("apiMonitorId") REFERENCES public."ApiMonitor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DockerContainer DockerContainer_serverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."DockerContainer"
    ADD CONSTRAINT "DockerContainer_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES public."Server"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: IncidentAlert IncidentAlert_alertId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."IncidentAlert"
    ADD CONSTRAINT "IncidentAlert_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES public."Alert"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: IncidentAlert IncidentAlert_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."IncidentAlert"
    ADD CONSTRAINT "IncidentAlert_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public."Incident"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: IncidentEvent IncidentEvent_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."IncidentEvent"
    ADD CONSTRAINT "IncidentEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: IncidentEvent IncidentEvent_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."IncidentEvent"
    ADD CONSTRAINT "IncidentEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public."Incident"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Incident Incident_assigneeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Incident"
    ADD CONSTRAINT "Incident_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Incident Incident_serverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Incident"
    ADD CONSTRAINT "Incident_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES public."Server"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InfrastructureCost InfrastructureCost_serverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."InfrastructureCost"
    ADD CONSTRAINT "InfrastructureCost_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES public."Server"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LogEntry LogEntry_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."LogEntry"
    ADD CONSTRAINT "LogEntry_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public."Incident"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LogEntry LogEntry_serverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."LogEntry"
    ADD CONSTRAINT "LogEntry_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES public."Server"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MetricSample MetricSample_serverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."MetricSample"
    ADD CONSTRAINT "MetricSample_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES public."Server"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RemediationAction RemediationAction_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."RemediationAction"
    ADD CONSTRAINT "RemediationAction_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RemediationAction RemediationAction_requestedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."RemediationAction"
    ADD CONSTRAINT "RemediationAction_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: infrapulse
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict NmY169zZye53unhTAnmGPIhtoYtJ461o1QFb3ohASguRGH6aAAGd2dD2IkfVN9T

