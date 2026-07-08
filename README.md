# DeadDrop
### Zero-Knowledge Agentic Dead Man's Switch
`Privacy Tech · Agentic AI · Zero-Trust Security`

DeadDrop is a privacy-first digital inheritance platform that secures your most sensitive assets — crypto keys, passwords, wills, and legal documents. Your files are encrypted directly inside your browser so that no third party (including DeadDrop's servers) can ever read them. 

A distributed layer of stateful AI agents monitors your telemetry, analyzes check-in patterns, detects potential coercion or cognitive decline, manages multi-channel escalation when you go silent, and guides your designated trustees through browser-side decryption and execution.

---

## 🔑 Core Features & Cryptographic Architecture

### 1. Zero-Knowledge Encryption
Your files never touch the internet in plaintext.
* **AES-GCM 256-bit Encryption**: The browser generates a random master key locally using the native **Web Crypto API**. Files are encrypted directly inside the browser tab before upload to AWS S3.
* **Shamir's Secret Sharing**: The master key is split mathematically into 3 distinct shares with a 2-of-3 threshold. Any single share is mathematically useless.
* **RSA-OAEP Key Wrapping**: Each share is encrypted in the browser with the respective trustee's RSA public key.
* **Client-Side Key Reconstruction**: Decryption occurs entirely inside the trustee's browser window when the 2-of-3 threshold is met. The server acts as a blind relay.

### 2. Password-Wrapped Trustee Keys
To prevent the server from accessing trustee private keys:
* Trustees generate an RSA-OAEP 2048-bit key pair locally in their browser upon registration.
* The trustee's private key is encrypted client-side using a key derived from a secret password (via **PBKDF2** + salt) before being uploaded to Supabase.
* On decryption, the trustee enters their password to decrypt their private key in memory, allowing them to unwrap their key share.

### 3. Encrypted Executor Instructions
To protect instructions (RAG context) from server inspection:
* Setup instructions written by the user are encrypted in the browser using an instructions key derived from their master passcode.
* **ChromaDB** stores only vector embeddings of the text for semantic retrieval.
* Plaintext instructions are decrypted client-side in the trustee's browser only after key reconstruction is complete, then fed to the RAG pipeline.

---

## 🤖 The 11 AI Agents System

DeadDrop organizes its background logic and interactions through a multi-agent system designed for security and guidance:

| # | Agent Name | Framework | Phase | Core Responsibility |
|---|---|---|---|---|
| **01** | **Onboarding Health Agent** | LangChain | Setup | Evaluates capsule configuration and gives a health score (0-100) to prevent faulty configurations (e.g., empty capsules, insufficient trustees). |
| **02** | **Trustee Readiness Agent** | LangGraph | Background | Periodically checks trustee communication channels (emails/logins) and prompts the user to reassign backup nodes if a trustee becomes inactive. |
| **03** | **Capsule Freshness Agent** | LangGraph | Background | Analyzes file metadata (age, file types) and prompts the user if credentials (like passwords) are likely stale. |
| **04** | **Cognitive Baseline Agent** | LangGraph + ChromaDB | Background | Silently analyzes user check-in patterns, response speeds, and vocabulary to build a cognitive baseline, alerting a designated contact of potential decline. |
| **05** | **Anti-Collusion Agent** | LangGraph | Background | Monitors trustee access logs for suspicious synchronized behavior (e.g., simultaneous logins from identical IPs) to freeze unauthorized releases. |
| **06** | **Wellness Verification Agent** | LangGraph + HuggingFace | Check-In | Conducts conversational verification using unpredictable contextual questions, sentiment classification, and timing analysis. |
| **07** | **Context-Aware Grace Agent** | LangGraph + ChromaDB | Missed Check-In | Evaluates user history (travel pre-registrations, past check-in behaviors) to calculate a personalized grace window. |
| **08** | **Multi-Channel Escalation Agent** | LangGraph | Missed Check-In | Executes an automated daily outreach pipeline across email (SendGrid), SMS (Twilio), and WhatsApp. |
| **09** | **Release Orchestrator Agent** | LangGraph (HITL) | Release | Manages the secure dispatch of key share retrieval links, coordinates trustee response thresholds, and logs activities. |
| **10** | **Trustee Guidance Agent** | LangGraph | Release | Serves as a step-by-step plain-language assistant for trustees during key submission and local decryption. |
| **11** | **Executor Guidance Agent** | LangChain + RAG | Post-Release | Answers trustee questions in real time using semantic search over the user's pre-written estate instructions. |

---

## 📂 Project Directory Structure & Usage

Below is the directory map of the DeadDrop application codebase:

```
DeadDrop/
├── public/                 # Static assets, icons, and configuration assets
│   └── favicon.ico         # App browser tab icon
├── src/
│   ├── assets/             # Global media and image assets
│   ├── components/         # Reusable presentation and utility components
│   │   ├── FilmGrain.jsx         # Applies a continuous subtle noise overlay across all views
│   │   ├── PageTransition.jsx    # Executes sharp, high-speed page transition cuts
│   │   └── CountdownRing.jsx     # Visualizes check-in countdown progress on the dashboard
│   ├── context/            # React global context providers
│   │   └── VaultContext.jsx      # Manages user session state, local Web Crypto calls, and agent triggers
│   ├── pages/              # Routing-level view components
│   │   ├── Landing.jsx           # Hero splash, core product pitch, and key-splitting animation
│   │   ├── Auth.jsx              # Google OAuth and user credential setup screens
│   │   ├── SetupWizard.jsx       # Multi-step capsule configuration wizard with Onboarding Health Agent scoring
│   │   ├── Dashboard.jsx         # Primary briefing console showing file health and countdown status
│   │   ├── FileManager.jsx       # Local AES-GCM file encryption panel and storage uploads
│   │   ├── Trustees.jsx          # Trustees directory displaying status and connection linkages
│   │   ├── EmergencyContacts.jsx # Configuration panel for emergency verification contacts
│   │   ├── CheckIn.jsx           # Conversational AI dialogue interface for verification check-ins
│   │   ├── AgentLogs.jsx         # Live console streaming real-time background agent logs
│   │   ├── Settings.jsx          # System configuration, intervals, and travel exception logs
│   │   ├── TrusteePortal.jsx     # Gateway for trustees to submit key shards and retrieve documents
│   │   └── SecurityAlert.jsx     # Lockdown alert overlay triggered upon suspected intrusion
│   ├── App.jsx             # Router definition and layout definitions
│   ├── index.css           # Tailwind configuration overrides, typography imports, and styling layers
│   └── main.jsx            # Application mount point and React bootstrap code
├── tailwind.config.js      # Customizes colors (Swiss Banking Indigo), font family mappings, and layouts
├── postcss.config.js       # Auto-prefixes CSS files during construction
├── vite.config.js          # Vite compiler and development server options
└── package.json            # Managed list of node dependencies and script definitions
```

---

## 🔄 System Workflow & Lifecycle

```
[ Phase 1: Onboarding ]
User signs up → Browser generates Master Key → User encrypts files locally → 
Master Key splits (Shamir 2-of-3) → Shards encrypted with Trustee Public Keys → 
Stored in Supabase. Health Agent evaluates readiness.
       ↓
[ Phase 2: Background Monitoring ]
Readiness Agent monitors trustees monthly. Freshness Agent checks files every 6 months.
Anti-Collusion Agent monitors logins.
       ↓
[ Phase 3: Telemetry Check-in ]
Timer reaches limit → Wellness Agent starts chat → Evaluates response, speed, 
and cognitive baseline. If OK, timer resets.
       ↓ (If Check-in Missed)
[ Phase 4: Grace & Escalation ]
Grace Agent calculates grace period → Escalation Agent triggers Multi-Channel pipeline:
Email (Day 7) → SMS (Day 8) → WhatsApp (Day 9) → Contact 1 (Day 10) → Contacts 2/3 (Day 11).
       ↓ (If No Response from Any Node)
[ Phase 5: Release Protocol ]
Release Orchestrator generates single-use links → Trustees authenticate → 
Submit key shares → Browser reconstructs Master Key locally → File decrypts.
       ↓
[ Phase 6: Post-Release Execution ]
Executor Guidance Agent starts RAG chat → Reads user-written instructions → 
Answers trustee questions on how to manage files.
```

---

## 🛠️ Technology Stack

* **Frontend**: React.js, Tailwind CSS, Framer Motion
* **Agent Orchestration**: LangGraph, LangChain
* **Long-Term Memory / RAG**: ChromaDB (Vector database)
* **NLP Classification**: HuggingFace Transformers
* **Cryptography**: Web Crypto API (AES-GCM, RSA-OAEP, PBKDF2), Shamir's Secret Sharing (JS)
* **Backend Services**: FastAPI, Supabase PostgreSQL, Supabase Auth
* **Notifications**: Twilio (SMS/WhatsApp), SendGrid (Email)
* **Storage**: AWS S3 (Encrypted blobs only)

---

## ⚠️ System Limitations

DeadDrop is designed with the following security boundaries:
1. **Death Detection vs. Unresponsiveness**: DeadDrop does not verify physical death. It confirms absolute unresponsiveness across email, SMS, WhatsApp, and emergency contacts over the user's chosen threshold period.
2. **Public Directory Limitations**: Automated online searches (e.g., looking up obituary postings) are unreliable for most users. Emergency contact response is the primary verification signal.
3. **No Native Mobile Access**: DeadDrop does not capture real-time GPS locations or device telemetry. It operates entirely as a secure web application to ensure compatibility and simplicity.
4. **Third-Party API Downtime**: In the event Twilio or SendGrid experiences service interruptions, check-in attempts fallback to the remaining available channels.
