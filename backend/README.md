Project Documentation: SecOps-Hub

(Cloud Vulnerability Tracker)

Here is your updated, enterprise-grade Project

Documentation (Software Requirement Specification \& Architecture Design),

fully rewritten to incorporate your newly expanded free cloud resources. This

version completely integrates AWS S3, AWS SNS, Auth0/Clerk, and GitHub

Actions CI/CD to paint the picture of a mature, production-level DevSecOps

ecosystem.

Save this directly as your README.md file in your GitHub

repository.

Project Documentation: vulnerabilitytracker (Cloud-Native DevSecOps

Vulnerability Management Platform)

1\. Executive Summary \& Problem Statement

In modern DevSecOps environments, security teams grapple

with fragmented logging, lack of centralized oversight, and delayed remediation

response windows. When automated security scanners identify vulnerabilities,

critical data often sits in raw, unformatted files without clear ownership

assignment or real-time escalation channels.

vulnerabilitytracker is a highly resilient, secure, full-stack

SecOps orchestration application designed to aggregate enterprise

infrastructure and software vulnerabilities into an actionable operational

cockpit. Enforcing rigorous identity parameters, automated alerting, secure

artifact storage, and continuous integration, vulnerabilitytracker minimizes the

mean-time-to-remediation (MTTR) of system risks.

2\. System Architecture \& Integrated Cloud Ecosystem

The application leverages a decoupled, distributed

multi-tier cloud topology optimized entirely within AWS and Industry Free

Tiers to maintain zero-cost production hosting.

                     \[ CLERK / AUTH0 ]  (Enterprise

Identity \& MFA)

                            |

                            v

 \[ React Frontend ]

\---> \[ AWS EC2 ] <--- \[ GITHUB ACTIONS CI/CD ]

  (Vercel

Hosting)      (VPC Protected)             ^

                            |                      |

     +----------------------+----------------------+

      |                                                      |                                     |

      v                                                     v                                     v

\[ SUPABASE / MONGO ]  \[ AMAZON S3 ]          \[ AWS SNS ]

(Data-in-Transit TLS)     (IAM Secure Bucket)   (Real-Time Alerts)

Infrastructure Stack Components:



 Presentation

     Layer (Frontend): React.js + Tailwind CSS + Recharts data

     visualization. Hosted on Vercel's global edge network.



 Application

     Layer (Backend API): Node.js (Express) or Python (FastAPI) deployed

     continuously on an AWS EC2 (t2.micro) compute node.



 Identity

     Provider (IDaaS): Clerk / Auth0 decoupling access management,

     offloading password hashing, and enforcing secure session cookies.



 Data

     Layer (Database): Managed Cloud Database (MongoDB Atlas / Supabase

     PostgreSQL) protected with TLS/SSL encryption for data-in-transit.



 Secure

     Object Storage: Amazon S3 (Simple Storage Service) for

     dedicated ingestion and storage of vulnerability screenshots, exploit

     proofs, and audit attachments.



 Asynchronous

     Telemetry: AWS SNS (Simple Notification Service) orchestrating

     instant downstream notification protocols.



 CI/CD

     Automation: GitHub Actions enforcing automated builds and

     remote SSH deployments.

Network Security \& Environment Hardening:

The application server resides within a customized AWS

VPC bound to rigid, stateful AWS Security Groups:



 Inbound

     Rules: Access is strictly bounded to Port 80 (HTTP) / 443 (HTTPS) for

     API consumers, and Port 22 (SSH) scoped explicitly to the administrator's

     structural CIDR IP address.



 Secrets

     Management: Environment variables, API tokens, and cloud keys are

     completely decoupled from source control using AWS Systems Manager

     (SSM) Parameter Store, pulled securely into local instance memory at

     runtime.

3\. Core Functional Requirements

3.1 Enterprise Authentication \& RBAC

User access is bounded via secure authentication states

passed via cryptographic claims:



 MFA

     Enforcement: Users authenticate through an identity portal providing

     Multi-Factor Authentication.



 Role-Based

     Authorization:



 

  Security-Admin:

      Retains blanket administrative rights (Full CRUD) over threat vectors,

      storage attachments, and configuration toggles.



  Developer:

      Read-only access to global visual widgets. Write access is restricted to

      mutating status flows (e.g., Open to In Progress or Resolved) only

      on entries matching their explicitly assigned developer identity profile.



 

3.2 Real-Time Alert Escalation (AWS SNS)

The application handles event-driven triggers. When a

vulnerability entry marked as Critical or High severity is submitted to the API

database:



 The

     backend publishes a payload to an AWS SNS Topic.



 AWS

     SNS evaluates subscription endpoints and distributes immediate SMS or

     Email notifications directly to the on-call Security Operations (SecOps)

     team.

3.3 Secure Artifact Handling (Amazon S3 Presigned URLs)

To prevent unauthenticated object data harvesting:



 Proof-of-concept

     (PoC) exploit attachments are uploaded to an isolated, fully private Amazon

     S3 Bucket.



 The

     frontend cannot access objects via static URLs. Instead, when an

     authorized user requests to view a file, the backend generates a

     time-bounded S3 Presigned URL that automatically expires after 15

     minutes.

4\. Software Hardening \& Application Security Policies

Defensive programming is maintained throughout the pipeline

to mitigate risks outlined in the OWASP Top 10:



 Injection

     Mitigation: Data persistence logic utilizes explicit parameterization

     models (Mongoose/Prisma ORM) to sanitize and encapsulate database

     transactions, neutralizing raw query injections.



 Least

     Privilege IAM Binding: The AWS EC2 server runs under an attached AWS

     IAM Instance Profile Role. The instance possesses programmatic access

     to perform only ssm:GetParameters, sns:Publish, and s3:PutObject /

     s3:GetObject on the explicitly named project infrastructure resources.



 Defense-in-Depth

     HTTP Headers: Server architecture configures Helmet.js

     middleware to inject rigorous HTTP response security rules:



 

  X-Content-Type-Options:

      nosniff (Defends against MIME-type exploitation)



  X-Frame-Options:

      DENY (Blocks Clickjacking framing vectors)



  Strict-Transport-Security

      (Enforces HTTPS across downstream browsers)



 

5\. Automated CI/CD Lifecycle (GitHub Actions)

A structural automation script

(.github/workflows/deploy.yml) is bound to the primary branch to manage

low-friction software shipping:

YAML

name: vulnerabilitytracker CI/CD Pipeline

on:

  push:

    branches: \[ main ]

 

jobs:

  build-and-deploy:

    runs-on:

ubuntu-latest

    steps:

      - name: Code

Checkout

        uses:

actions/checkout@v4

 

      - name: Install

Dependencies \& Run Tests

        run: |

          npm install

          npm test

 

      - name: Deploy

to AWS EC2 Production

        uses:

appleboy/ssh-action@master

        with:

          host: ${{

secrets.EC2\_HOST\_IP }}

          username:

ubuntu

          key: ${{

secrets.EC2\_SSH\_PRIVATE\_KEY }}

          script: |

            cd

/var/www/vulnerabilitytracker-backend

            git pull

origin main

            npm

install --production

            pm2

restart app-server

6\. Implementation Architecture Phasing

The implementation pathway is broken down into structured

sprints to systematically construct the platform architecture:



 Phase

     1: Cloud Provisioning \& IAM Boundary Design: Instantiate the AWS

     EC2 container, lock down VPC Security Group routing matrices, formulate

     the S3 private bucket parameters, and map execution limits via IAM Role

     binding.



 Phase

     2: Secure Identity \& Database Construction: Provision the remote

     database instance schemas, link the Clerk/Auth0 provider, and script

     backend API endpoints hardened with input validation and security

     middleware headers.



 Phase

     3: Front-End UI Data Binding: Construct the React workspace with

     Tailwind CSS formatting. Map API endpoints to dynamically populate ledger

     grids and translate server arrays into graphical visual reports via

     Recharts.



 Phase

     4: Automation \& Verification Audits: Establish the GitHub Actions

     runner sequence to automate build shipping, hook the AWS SNS alerting code

     loops, and simulate failure modes to guarantee role constraints hold true.

