require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcrypt');
const multer     = require('multer');
const path       = require('path');

const { DynamoDBClient }                                                          = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand }   = require('@aws-sdk/client-s3');
const { getSignedUrl }                                                            = require('@aws-sdk/s3-request-presigner');
const { SNSClient, PublishCommand }                                               = require('@aws-sdk/client-sns');

// ============================================
// AWS CLIENTS
// ============================================
const region    = process.env.AWS_REGION || 'ap-south-1';
const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client  = new S3Client({ region });
const snsClient = new SNSClient({ region });

// ============================================
// MULTER — image + PDF + DOC/DOCX
// ============================================
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    ALLOWED_MIME_TYPES.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

// ============================================
// MULTER — JSON scan report import
// ============================================
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    file.mimetype === 'application/json' || file.originalname.endsWith('.json')
      ? cb(null, true)
      : cb(new Error('Only .json scan report files are accepted.'));
  },
});

// ============================================
// BRUTE FORCE — in-memory
// ============================================
const loginAttempts = new Map();
const blockedIPs    = new Map();
const MAX_ATTEMPTS   = 5;
const BLOCK_DURATION = 15 * 60 * 1000;

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim()
    || req.connection?.remoteAddress
    || req.ip
    || 'unknown';
}

function isIPBlocked(ip) {
  const block = blockedIPs.get(ip);
  if (!block) return false;
  if (Date.now() > block.unblockAt) {
    blockedIPs.delete(ip);
    loginAttempts.delete(ip);
    return false;
  }
  return true;
}

// ============================================
// HELPERS — security event + audit log + SNS
// ============================================
async function logSecurityEvent(type, ip, username, attempts = null) {
  try {
    const eventId = `SEC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    await docClient.send(new PutCommand({
      TableName: 'secophub-security-events',
      Item: { eventId, type, ip, username: username || null, attempts: attempts || null, createdAt: new Date().toISOString(), timestamp: Date.now() },
    }));
  } catch (e) { console.error('Security event log error:', e.message); }
}

async function logAudit(action, performedBy, targetId, details) {
  try {
    const auditId = `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    await docClient.send(new PutCommand({
      TableName: 'secophub-audit-logs',
      Item: { auditId, action, performedBy, targetId: targetId || null, details: details || null, createdAt: new Date().toISOString(), timestamp: Date.now() },
    }));
  } catch (e) { console.error('Audit log error:', e.message); }
}

async function sendBruteForceAlert(ip, username) {
  try {
    await snsClient.send(new PublishCommand({
      TopicArn: process.env.SNS_TOPIC_ARN,
      Subject:  '🚨 SecOpHub — Brute Force Attack Detected',
      Message:  `SECURITY ALERT\n\nBrute force attack detected on SecOpHub login.\n\nIP Address: ${ip}\nAttempted Username: ${username || 'unknown'}\nTime: ${new Date().toISOString()}\nAction: IP has been blocked for 15 minutes.\n\nLog in to SecOpHub to review the Security Monitor page.`,
    }));
  } catch (e) { console.error('SNS brute force alert failed:', e.message); }
}

// ============================================
// EXPRESS APP
// ============================================
const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: [process.env.FRONTEND_URL || '*'], credentials: true }));
app.use(express.json());

// ============================================
// JWT MIDDLEWARE
// ============================================
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication token required.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

// ============================================
// AUTH — LOGIN
// ============================================
app.post('/api/auth/login', async (req, res) => {
  const ip = getClientIP(req);
  const { username, password } = req.body;

  if (isIPBlocked(ip)) {
    const block = blockedIPs.get(ip);
    const minutesLeft = Math.ceil((block.unblockAt - Date.now()) / 60000);
    return res.status(429).json({ blocked: true, minutesLeft, error: 'IP blocked due to repeated failed attempts.' });
  }

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const result = await docClient.send(new GetCommand({ TableName: 'secophub-users', Key: { username } }));
    const user   = result.Item;
    const passwordMatch = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !passwordMatch) {
      const attempts = loginAttempts.get(ip) || { count: 0, firstAttempt: Date.now() };
      attempts.count++;
      loginAttempts.set(ip, attempts);
      await logSecurityEvent('FAILED_LOGIN', ip, username, attempts.count);
      const attemptsLeft = MAX_ATTEMPTS - attempts.count;

      if (attempts.count >= MAX_ATTEMPTS) {
        blockedIPs.set(ip, { ip, blockedAt: Date.now(), unblockAt: Date.now() + BLOCK_DURATION, attempts: attempts.count, username });
        loginAttempts.delete(ip);
        await logSecurityEvent('IP_BLOCKED', ip, username, attempts.count);
        await sendBruteForceAlert(ip, username);
        return res.status(429).json({ blocked: true, minutesLeft: 15, error: 'Too many failed attempts. IP blocked for 15 minutes.' });
      }

      return res.status(401).json({ error: 'Invalid username or password.', attemptsLeft: Math.max(0, attemptsLeft) });
    }

    // SUCCESS
    loginAttempts.delete(ip);
    await logSecurityEvent('SUCCESS_LOGIN', ip, username);
    await logAudit('LOGIN', username, null, `Login from IP ${ip}`);

    const token = jwt.sign(
      { username: user.username, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, user: { username: user.username, role: user.role, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication service error.' });
  }
});

// Auth middleware for all routes below
app.use('/api', authenticateToken);

// ============================================
// VULNERABILITIES
// ============================================

// GET all — developers only see vulnerabilities assigned to them
app.get('/api/vulnerabilities', async (req, res) => {
  try {
    const result = await docClient.send(new ScanCommand({ TableName: process.env.DYNAMODB_TABLE_NAME }));
    let items = result.Items || [];

    if (req.user.role?.toLowerCase() === 'developer') {
      items = items.filter(v => v.assignedTo === req.user.username);
    }

    res.status(200).json({ count: items.length, vulnerabilities: items });
  } catch (error) {
    console.error('Failed to fetch vulnerabilities:', error);
    res.status(500).json({ error: 'Failed to fetch vulnerabilities' });
  }
});

// GET single
app.get('/api/vulnerabilities/:id', async (req, res) => {
  try {
    const result = await docClient.send(new GetCommand({ TableName: process.env.DYNAMODB_TABLE_NAME, Key: { ID: req.params.id } }));
    if (!result.Item) return res.status(404).json({ error: 'Vulnerability not found' });

    if (req.user.role?.toLowerCase() === 'developer' && result.Item.assignedTo !== req.user.username) {
      return res.status(403).json({ error: 'Forbidden: This vulnerability is not assigned to you.' });
    }

    res.status(200).json(result.Item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vulnerability' });
  }
});

// POST create
app.post('/api/vulnerabilities', upload.single('screenshot'), async (req, res) => {
  const role = req.user.role?.toLowerCase();
  if (!['admin', 'analyst'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden: Only Admin and Analyst can add vulnerabilities.' });
  }
  try {
    const { title, description, severity, assignedTo } = req.body;
    if (!title || !description || !severity) {
      return res.status(400).json({ error: 'Title, description, and severity are required.' });
    }

    const id        = `VULN-${Date.now()}`;
    const createdAt = new Date().toISOString();
    let   proofUrl  = 'None Attached';

    if (req.file) {
      const s3Key = `proofs/${id}-${req.file.originalname.replace(/\s+/g, '-')}`;
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME, Key: s3Key,
        Body: req.file.buffer, ContentType: req.file.mimetype,
      }));
      proofUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${s3Key}`;
    }

    const item = {
      ID: id, title, description, severity, status: 'Open', createdAt,
      createdBy: req.user.username, proofOfConceptUrl: proofUrl,
      assignedTo: assignedTo || null,
    };
    await docClient.send(new PutCommand({ TableName: process.env.DYNAMODB_TABLE_NAME, Item: item }));

    if (['Critical', 'High'].includes(severity)) {
      try {
        await snsClient.send(new PublishCommand({
          TopicArn: process.env.SNS_TOPIC_ARN,
          Subject:  `🚨 ${severity} Vulnerability Logged — ${title}`,
          Message:  `New ${severity} vulnerability logged on SecOpHub.\n\nTitle: ${title}\nID: ${id}\nDescription: ${description}\nLogged by: ${req.user.username}\nTime: ${createdAt}\n\nLogin to SecOpHub to view and remediate.`,
        }));
        await docClient.send(new PutCommand({
          TableName: 'secophub-alerts',
          Item: { alertId: `ALERT-${Date.now()}`, vulnerabilityId: id.replace('VULN-', ''), vulnerabilityTitle: title, severity, sentTo: 'admin@secophub.com', triggeredBy: req.user.username, createdAt },
        }));
      } catch (snsErr) { console.error('SNS alert failed:', snsErr.message); }
    }

    res.status(201).json({ message: 'Vulnerability logged successfully.', ID: id, item });
    await logAudit('VULN_CREATED', req.user.username, id, `Created: ${title} · Severity: ${severity}`);
    if (assignedTo) {
      await logAudit('VULN_ASSIGNED', req.user.username, id, `Assigned to ${assignedTo} at creation`);
    }
  } catch (error) {
    console.error('Failed to create vulnerability:', error);
    res.status(500).json({ error: 'Failed to create vulnerability' });
  }
});

// ============================================
// IMPORT SCAN REPORT — bulk create from JSON
// ============================================
app.post('/api/vulnerabilities/import', importUpload.single('report'), async (req, res) => {
  const role = req.user.role?.toLowerCase();
  if (!['admin', 'analyst'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden: Only Admin and Analyst can import scan reports.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Attach a .json scan report.' });
  }

  let parsed;
  try {
    parsed = JSON.parse(req.file.buffer.toString('utf-8'));
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON file. Could not parse scan report.' });
  }

  const findings = parsed.findings;
  if (!Array.isArray(findings) || findings.length === 0) {
    return res.status(400).json({ error: 'Scan report must contain a non-empty "findings" array.' });
  }

  const ALLOWED_SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
  const createdItems = [];
  const skipped = [];

  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    const title       = f.title?.trim();
    const description = f.description?.trim() || 'No description provided in scan report.';
    let severity      = f.severity?.trim();
    if (severity) severity = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();

    if (!title || !ALLOWED_SEVERITIES.includes(severity)) {
      skipped.push({ index: i, reason: !title ? 'Missing title' : `Invalid severity "${f.severity}"`, finding: f });
      continue;
    }

    const id        = `VULN-${Date.now()}-${i}`;
    const createdAt = new Date().toISOString();
    const item = {
      ID: id,
      title,
      description,
      severity,
      status: 'Open',
      createdAt,
      createdBy: req.user.username,
      proofOfConceptUrl: 'None Attached',
      assignedTo: null,
      source: parsed.scanName ? `Imported: ${parsed.scanName}` : 'Imported scan report',
    };

    try {
      await docClient.send(new PutCommand({ TableName: process.env.DYNAMODB_TABLE_NAME, Item: item }));
      createdItems.push(item);
    } catch (e) {
      skipped.push({ index: i, reason: 'Database write failed', finding: f });
    }
  }

  const criticalOrHigh = createdItems.filter(i => ['Critical', 'High'].includes(i.severity));
  if (criticalOrHigh.length > 0) {
    try {
      await snsClient.send(new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN,
        Subject:  `🚨 Scan Import — ${criticalOrHigh.length} Critical/High Finding(s)`,
        Message:  `A scan report was imported on SecOpHub.\n\nScan: ${parsed.scanName || 'Unnamed scan'}\nTotal imported: ${createdItems.length}\nCritical/High findings: ${criticalOrHigh.length}\nImported by: ${req.user.username}\nTime: ${new Date().toISOString()}\n\nLogin to SecOpHub to review.`,
      }));
      await docClient.send(new PutCommand({
        TableName: 'secophub-alerts',
        Item: {
          alertId: `ALERT-${Date.now()}`,
          vulnerabilityId: 'BULK-IMPORT',
          vulnerabilityTitle: `Scan import: ${parsed.scanName || 'Unnamed scan'} (${criticalOrHigh.length} critical/high)`,
          severity: 'Critical',
          sentTo: 'admin@secophub.com',
          triggeredBy: req.user.username,
          createdAt: new Date().toISOString(),
        },
      }));
    } catch (snsErr) { console.error('SNS import alert failed:', snsErr.message); }
  }

  await logAudit(
    'SCAN_IMPORTED',
    req.user.username,
    null,
    `Imported ${createdItems.length} finding(s) from "${parsed.scanName || 'unnamed scan'}" (${skipped.length} skipped)`
  );

  res.status(201).json({
    message: `Import complete. ${createdItems.length} vulnerabilities created, ${skipped.length} skipped.`,
    imported: createdItems.length,
    skippedCount: skipped.length,
    skipped,
    items: createdItems,
  });
});

// PATCH status
app.patch('/api/vulnerabilities/:id/status', async (req, res) => {
  const role = req.user.role?.toLowerCase();
  if (!['admin', 'analyst', 'developer'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  const { status } = req.body;
  const allowed = ['Open', 'In Progress', 'Resolved', 'Closed'];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${allowed.join(', ')}` });
  }

  if (role === 'developer') {
    try {
      const existing = await docClient.send(new GetCommand({ TableName: process.env.DYNAMODB_TABLE_NAME, Key: { ID: req.params.id } }));
      if (!existing.Item || existing.Item.assignedTo !== req.user.username) {
        return res.status(403).json({ error: 'Forbidden: This vulnerability is not assigned to you.' });
      }
    } catch (e) {
      return res.status(500).json({ error: 'Failed to verify assignment.' });
    }
  }

  try {
    await docClient.send(new UpdateCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { ID: req.params.id },
      UpdateExpression: 'set #s = :status',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': status },
    }));
    res.json({ message: 'Status updated successfully', ID: req.params.id, status });
    await logAudit('STATUS_CHANGED', req.user.username, req.params.id, `Status changed to ${status}`);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// PATCH assign vulnerability to a developer
app.patch('/api/vulnerabilities/:id/assign', async (req, res) => {
  const role = req.user.role?.toLowerCase();
  if (!['admin', 'analyst'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden: Only Admin and Analyst can assign vulnerabilities.' });
  }
  const { assignedTo } = req.body;
  try {
    await docClient.send(new UpdateCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { ID: req.params.id },
      UpdateExpression: 'set assignedTo = :a',
      ExpressionAttributeValues: { ':a': assignedTo || null },
    }));
    res.json({ message: 'Assignment updated.', ID: req.params.id, assignedTo: assignedTo || null });
    await logAudit(
      'VULN_ASSIGNED',
      req.user.username,
      req.params.id,
      assignedTo ? `Assigned to ${assignedTo}` : 'Unassigned'
    );
  } catch (error) {
    console.error('Failed to update assignment:', error);
    res.status(500).json({ error: 'Failed to update assignment.' });
  }
});

// DELETE vulnerability + S3 artifacts
app.delete('/api/vulnerabilities/:id', async (req, res) => {
  if (req.user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only administrators can delete vulnerabilities.' });
  }
  try {
    const id = req.params.id;

    try {
      const s3List = await s3Client.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET_NAME, Prefix: `proofs/${id}-` }));
      if (s3List.Contents?.length > 0) {
        await Promise.all(s3List.Contents.map(obj => s3Client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: obj.Key }))));
        console.log(`Deleted ${s3List.Contents.length} S3 artifact(s) for ${id}`);
      }
    } catch (s3Err) { console.error('S3 artifact deletion error:', s3Err.message); }

    await docClient.send(new DeleteCommand({ TableName: process.env.DYNAMODB_TABLE_NAME, Key: { ID: id } }));
    res.json({ message: 'Vulnerability and associated artifacts deleted successfully.', ID: id });
    await logAudit('VULN_DELETED', req.user.username, id, `Vulnerability permanently deleted`);
  } catch (error) {
    console.error('Failed to delete vulnerability:', error);
    res.status(500).json({ error: 'Failed to delete vulnerability.' });
  }
});

// PATCH attach proof to existing vulnerability
app.patch('/api/vulnerabilities/:id/proof', upload.single('proof'), async (req, res) => {
  const role = req.user.role?.toLowerCase();
  if (!['admin', 'analyst'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden: Only Admin and Analyst can attach proof.' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  try {
    const id    = req.params.id;
    const s3Key = `proofs/${id}-${req.file.originalname.replace(/\s+/g, '-')}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME, Key: s3Key,
      Body: req.file.buffer, ContentType: req.file.mimetype,
    }));
    const proofUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${s3Key}`;
    await docClient.send(new UpdateCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { ID: id },
      UpdateExpression: 'set proofOfConceptUrl = :p',
      ExpressionAttributeValues: { ':p': proofUrl },
    }));
    await logAudit('PROOF_ATTACHED', req.user.username, id, `Proof attached: ${req.file.originalname}`);
    res.json({ message: 'Proof attached successfully.', proofUrl });
  } catch (error) {
    console.error('Attach proof error:', error);
    res.status(500).json({ error: 'Failed to attach proof.' });
  }
});

// GET presigned proof URL
app.get('/api/vulnerabilities/:id/proof-url', async (req, res) => {
  try {
    const result = await docClient.send(new GetCommand({ TableName: process.env.DYNAMODB_TABLE_NAME, Key: { ID: req.params.id } }));
    if (!result.Item) return res.status(404).json({ error: 'Not found' });

    if (req.user.role?.toLowerCase() === 'developer' && result.Item.assignedTo !== req.user.username) {
      return res.status(403).json({ error: 'Forbidden: This vulnerability is not assigned to you.' });
    }

    const proof = result.Item.proofOfConceptUrl;
    if (!proof || proof === 'None Attached') return res.status(404).json({ error: 'No proof attached' });
    const urls   = Array.isArray(proof) ? proof : [proof];
    const signed = await Promise.all(urls.map(url => {
      const key = url.split('.amazonaws.com/')[1];
      return getSignedUrl(s3Client, new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key }), { expiresIn: 900 });
    }));
    res.json({ urls: signed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
});

// ============================================
// ARTIFACTS
// ============================================

app.get('/api/artifacts', async (req, res) => {
  if (!['admin', 'analyst'].includes(req.user.role?.toLowerCase())) {
    return res.status(403).json({ error: 'Forbidden: Insufficient access to view artifacts.' });
  }
  try {
    const result = await s3Client.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET_NAME, Prefix: 'proofs/' }));
    const files  = await Promise.all(
      (result.Contents || []).filter(obj => obj.Key !== 'proofs/').map(async (obj) => {
        const url      = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: obj.Key }), { expiresIn: 900 });
        const fileName = obj.Key.replace('proofs/', '');
        const vulnId   = fileName.split('-').slice(0, 2).join('-');
        return { key: obj.Key, fileName, vulnId, size: obj.Size, lastModified: obj.LastModified, presignedUrl: url };
      })
    );
    res.json({ files, count: files.length });
  } catch (error) {
    console.error('Failed to list artifacts:', error);
    res.status(500).json({ error: 'Failed to list artifacts.' });
  }
});

app.delete('/api/artifacts/:filename', async (req, res) => {
  if (req.user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only administrators can delete artifacts.' });
  }
  try {
    const key = decodeURIComponent(req.params.filename);
    await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key }));
    res.json({ message: 'Artifact deleted successfully.', key });
  } catch (error) {
    console.error('Failed to delete artifact:', error);
    res.status(500).json({ error: 'Failed to delete artifact.' });
  }
});

// ============================================
// ALERTS
// ============================================

app.get('/api/alerts', async (req, res) => {
  if (req.user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin clearance required.' });
  }
  try {
    const result = await docClient.send(new ScanCommand({ TableName: 'secophub-alerts' }));
    const alerts = (result.Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ alerts, count: alerts.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts.' });
  }
});

app.delete('/api/alerts/:alertId', async (req, res) => {
  if (req.user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin clearance required.' });
  }
  try {
    await docClient.send(new DeleteCommand({ TableName: 'secophub-alerts', Key: { alertId: req.params.alertId } }));
    res.json({ message: 'Alert deleted.', alertId: req.params.alertId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete alert.' });
  }
});

// ============================================
// STATS & ANALYTICS
// ============================================

app.get('/api/stats', async (req, res) => {
  try {
    const result = await docClient.send(new ScanCommand({ TableName: process.env.DYNAMODB_TABLE_NAME }));
    const v = result.Items || [];
    res.status(200).json({
      total:    v.length,
      critical: v.filter(i => i.severity === 'Critical').length,
      high:     v.filter(i => i.severity === 'High').length,
      medium:   v.filter(i => i.severity === 'Medium').length,
      low:      v.filter(i => i.severity === 'Low').length,
      resolved: v.filter(i => i.status === 'Resolved').length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate statistics' });
  }
});

app.get('/api/dashboard/analytics', async (req, res) => {
  if (req.user.role?.toLowerCase() === 'developer') {
    return res.status(403).json({ error: 'Forbidden: Insufficient metrics clearance.' });
  }
  try {
    const result = await docClient.send(new ScanCommand({ TableName: process.env.DYNAMODB_TABLE_NAME }));
    const items  = result.Items || [];
    const status   = { open: items.filter(i => !i.status || i.status === 'Open').length, inProgress: items.filter(i => i.status === 'In Progress').length, resolved: items.filter(i => i.status === 'Resolved').length };
    const severity = { critical: items.filter(i => i.severity === 'Critical').length, high: items.filter(i => i.severity === 'High').length, medium: items.filter(i => i.severity === 'Medium').length, low: items.filter(i => i.severity === 'Low').length };
    const last7Days = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      last7Days[d.toISOString().split('T')[0]] = 0;
    }
    items.forEach(item => { if (item.createdAt) { const k = item.createdAt.split('T')[0]; if (last7Days[k] !== undefined) last7Days[k]++; } });
    const trend = Object.keys(last7Days).sort().map(date => ({ date, count: last7Days[date] }));
    res.json({ total: items.length, status, severity, weeklyTrend: trend });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// ============================================
// TEAM
// ============================================

app.get('/api/team', async (req, res) => {
  try {
    const result = await docClient.send(new ScanCommand({ TableName: 'secophub-users' }));
    const team   = (result.Items || []).map(({ password: _, ...rest }) => rest);
    res.json({ team, count: team.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team.' });
  }
});

app.post('/api/team', async (req, res) => {
  if (req.user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only admins can add team members.' });
  }
  const { username, password, name, role, email } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password and role are required.' });
  }
  const allowedRoles = ['admin', 'analyst', 'developer'];
  if (!allowedRoles.includes(role.toLowerCase())) {
    return res.status(400).json({ error: `Invalid role. Allowed: ${allowedRoles.join(', ')}` });
  }
  try {
    const hashedPwd = await bcrypt.hash(password, 12);
    await docClient.send(new PutCommand({
      TableName: 'secophub-users',
      Item: { username, password: hashedPwd, name: name || username, role: role.toLowerCase(), email: email || null, createdAt: new Date().toISOString() },
      ConditionExpression: 'attribute_not_exists(username)',
    }));
    res.status(201).json({ message: 'Team member added.' });
    await logAudit('MEMBER_ADDED', req.user.username, username, `Added ${username} as ${role}`);
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return res.status(409).json({ error: 'Username already exists.' });
    }
    res.status(500).json({ error: 'Failed to add team member.' });
  }
});

app.delete('/api/team/:username', async (req, res) => {
  if (req.user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only admins can remove team members.' });
  }
  if (req.params.username === req.user.username) {
    return res.status(400).json({ error: 'You cannot remove yourself.' });
  }
  try {
    await docClient.send(new DeleteCommand({ TableName: 'secophub-users', Key: { username: req.params.username } }));
    res.json({ message: 'Team member removed.' });
    await logAudit('MEMBER_REMOVED', req.user.username, req.params.username, `Removed ${req.params.username} from team`);
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove team member.' });
  }
});

// ============================================
// SECURITY ENDPOINTS
// ============================================

app.get('/api/security/events', async (req, res) => {
  if (req.user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin clearance required.' });
  }
  try {
    const result = await docClient.send(new ScanCommand({ TableName: 'secophub-security-events' }));
    const events = (result.Items || []).sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
    res.json({ events, count: events.length });
  } catch (error) {
    console.error('Security events error:', error);
    res.json({ events: [], count: 0 });
  }
});

app.get('/api/security/blocked-ips', async (req, res) => {
  if (req.user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin clearance required.' });
  }
  try {
    const now     = Date.now();
    const current = Array.from(blockedIPs.entries())
      .filter(([, v]) => now < v.unblockAt)
      .map(([ip, v]) => ({ ip, attempts: v.attempts, username: v.username, blockedAt: new Date(v.blockedAt).toISOString(), unblockAt: new Date(v.unblockAt).toISOString() }));
    res.json({ blockedIPs: current, count: current.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blocked IPs.' });
  }
});

app.post('/api/security/unblock', async (req, res) => {
  if (req.user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin clearance required.' });
  }
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP address required.' });
  try {
    blockedIPs.delete(ip);
    loginAttempts.delete(ip);
    await logSecurityEvent('IP_UNBLOCKED', ip, req.user.username);
    res.json({ message: `IP ${ip} has been unblocked.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unblock IP.' });
  }
});

// ============================================
// AUDIT LOGS
// ============================================

app.get('/api/audit-logs', async (req, res) => {
  if (req.user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access only.' });
  }
  try {
    const result = await docClient.send(new ScanCommand({ TableName: 'secophub-audit-logs' }));
    const logs   = (result.Items || []).sort((a, b) => b.timestamp - a.timestamp).slice(0, 200);
    res.json({ logs, count: logs.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 SecOpHub engine operational on port ${PORT}`));