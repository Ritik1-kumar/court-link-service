// Embedded email templates - all templates are included here to ensure they're bundled with the function
// This avoids file system access issues in Supabase Edge Functions

export const templates: Record<string, string> = {
  "case-submitted-applicant": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Case Submitted Successfully</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #2563eb;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 20px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            margin: 20px 0;
        }
        .case-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .case-details ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .case-details li {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .case-details li:last-child {
            border-bottom: none;
        }
        .case-details strong {
            display: inline-block;
            width: 150px;
            color: #495057;
        }
        .next-steps {
            background-color: #e7f3ff;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .next-steps h3 {
            margin-top: 0;
            color: #2563eb;
        }
        .next-steps ol {
            margin: 10px 0;
            padding-left: 20px;
        }
        .next-steps li {
            margin: 10px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
        .signature {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Case Submitted Successfully</h1>
        </div>
        
        <div class="content">
            <p>Hi there,</p>
            
            <p><strong>Your case has been successfully submitted!</strong></p>
            
            <div class="case-details">
                <h3 style="margin-top: 0;">Case Details:</h3>
                <ul>
                    <li><strong>Case ID:</strong> {{caseId}}</li>
                    <li><strong>Claimant Name:</strong> {{claimantName}}</li>
                    <li><strong>Defendant Name:</strong> {{defendantName}}</li>
                    <li><strong>Judgment Amount:</strong> {{judgmentAmount}}</li>
                    <li><strong>Submission Date:</strong> {{submissionDate}}</li>
                    <li><strong>Status:</strong> {{status}}</li>
                </ul>
            </div>
            
            <div class="next-steps">
                <h3>What happens next?</h3>
                <ol>
                    <li>Your case will be reviewed by our admin team within 24-48 hours</li>
                    <li>Once approved, legal forms will be prepared and sent to the HCEO</li>
                    <li>You'll receive email updates at each stage of the process</li>
                </ol>
            </div>
            
            <p>You can track your case status anytime by logging into your dashboard.</p>
        </div>
        
        <div class="footer">
            <p>Best regards,</p>
            <p class="signature"><strong>CourtLink Services Team</strong></p>
        </div>
    </div>
</body>
</html>`,

  "case-submitted-admin": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Case Notification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #dc2626;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 20px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            margin: 20px 0;
        }
        .case-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .case-details ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .case-details li {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .case-details li:last-child {
            border-bottom: none;
        }
        .case-details strong {
            display: inline-block;
            width: 150px;
            color: #495057;
        }
        .action-required {
            background-color: #fef2f2;
            border-left: 4px solid #dc2626;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .action-required p {
            margin: 0;
            color: #991b1b;
            font-weight: 500;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
        .signature {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Case Submitted</h1>
        </div>
        
        <div class="content">
            <p>Hi Admin,</p>
            
            <p><strong>A new case has been submitted and requires your review.</strong></p>
            
            <div class="case-details">
                <h3 style="margin-top: 0;">Case Details:</h3>
                <ul>
                    <li><strong>Case ID:</strong> {{caseId}}</li>
                    <li><strong>Claimant Name:</strong> {{claimantName}}</li>
                    <li><strong>Defendant Name:</strong> {{defendantName}}</li>
                    <li><strong>Judgment Amount:</strong> {{judgmentAmount}}</li>
                    <li><strong>Submission Date:</strong> {{submissionDate}}</li>
                    <li><strong>Applicant Email:</strong> {{applicantEmail}}</li>
                </ul>
            </div>
            
            <div class="action-required">
                <p>Please log in to review and approve this case.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Best regards,</p>
            <p class="signature"><strong>CourtLink Services System</strong></p>
        </div>
    </div>
</body>
</html>`,

  "welcome": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to CourtLink Services</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #2563eb;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 20px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            margin: 20px 0;
        }
        .account-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .account-details ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .account-details li {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .account-details li:last-child {
            border-bottom: none;
        }
        .account-details strong {
            display: inline-block;
            width: 150px;
            color: #495057;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
        .signature {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to CourtLink Services</h1>
        </div>
        
        <div class="content">
            <p>Hi {{fullName}},</p>
            
            <p>Welcome to our CourtLink Services! Your account has been successfully created.</p>
            
            <div class="account-details">
                <h3 style="margin-top: 0;">Account Details:</h3>
                <ul>
                    <li><strong>Email:</strong> {{email}}</li>
                    <li><strong>Role:</strong> {{role}}</li>
                </ul>
            </div>
            
            <p>You can now log in and start managing your cases.</p>
        </div>
        
        <div class="footer">
            <p>Best regards,</p>
            <p class="signature"><strong>The Team</strong></p>
        </div>
    </div>
</body>
</html>`,

  "admin-notification": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New User Registration</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #dc2626;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 20px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            margin: 20px 0;
        }
        .user-info, .bank-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .user-info ul, .bank-details ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .user-info li, .bank-details li {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .user-info li:last-child, .bank-details li:last-child {
            border-bottom: none;
        }
        .user-info strong, .bank-details strong {
            display: inline-block;
            width: 180px;
            color: #495057;
        }
        .action-required {
            background-color: #fef2f2;
            border-left: 4px solid #dc2626;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .action-required p {
            margin: 0;
            color: #991b1b;
            font-weight: 500;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
        .signature {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New User Registration - {{fullName}}</h1>
        </div>
        
        <div class="content">
            <p>Hi Admin,</p>
            
            <p>A new user has registered on CourtLink Services.</p>
            
            <div class="user-info">
                <h3 style="margin-top: 0;">User Information:</h3>
                <ul>
                    <li><strong>Name:</strong> {{fullName}}</li>
                    <li><strong>Email:</strong> {{email}}</li>
                    <li><strong>Phone:</strong> {{phone}}</li>
                    <li><strong>Role:</strong> {{role}}</li>
                    <li><strong>Registration Date:</strong> {{registrationDate}}</li>
                </ul>
            </div>
            
            <div class="bank-details">
                <h3 style="margin-top: 0;">Bank Details:</h3>
                <ul>
                    <li><strong>Bank Name:</strong> {{bankName}}</li>
                    <li><strong>Account Number:</strong> {{accountNumber}}</li>
                    <li><strong>Sort Code:</strong> {{sortCode}}</li>
                    <li><strong>Account Holder Name:</strong> {{accountHolderName}}</li>
                </ul>
            </div>
            
            <div class="user-info">
                <ul>
                    <li><strong>VAT Reclaim:</strong> {{vatReclaim}}</li>
                </ul>
            </div>
            
            <div class="action-required">
                <p>Please review this registration in the admin dashboard.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Best regards,</p>
            <p class="signature"><strong>CourtLink Services System</strong></p>
        </div>
    </div>
</body>
</html>`,

  "case-approved": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Case Approved</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #16a34a;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 20px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            margin: 20px 0;
        }
        .case-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .case-details ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .case-details li {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .case-details li:last-child {
            border-bottom: none;
        }
        .case-details strong {
            display: inline-block;
            width: 150px;
            color: #495057;
        }
        .admin-note {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .admin-note p {
            margin: 0;
            color: #92400e;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
        .signature {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Case {{caseId}} Approved - Application Sent to Court</h1>
        </div>
        
        <div class="content">
            <p>Hi {{hceoName}},</p>
            
            <p>Case {{caseId}} has been approved and assigned to you.</p>
            
            <div class="case-details">
                <h3 style="margin-top: 0;">Case Details:</h3>
                <ul>
                    <li><strong>Claimant:</strong> {{claimantName}}</li>
                    <li><strong>Defendant:</strong> {{defendantName}}</li>
                    <li><strong>Judgment Amount:</strong> {{judgmentAmount}}</li>
                    <li><strong>Approval Date:</strong> {{approvalDate}}</li>
                </ul>
            </div>
            
            <div class="admin-note">
                <p><strong>Admin Note:</strong> {{adminNote}}</p>
            </div>
            
            <p>The application has been sent to court. You will be notified when the sealed writ is received.</p>
        </div>
        
        <div class="footer">
            <p>Best regards,</p>
            <p class="signature"><strong>CourtLink Services</strong></p>
        </div>
    </div>
</body>
</html>`,

  "case-returned": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Case Returned</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #dc2626;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 20px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            margin: 20px 0;
        }
        .case-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .case-details ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .case-details li {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .case-details li:last-child {
            border-bottom: none;
        }
        .case-details strong {
            display: inline-block;
            width: 150px;
            color: #495057;
        }
        .return-reason {
            background-color: #fef2f2;
            border-left: 4px solid #dc2626;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .return-reason p {
            margin: 0;
            color: #991b1b;
        }
        .action-required {
            background-color: #e7f3ff;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .action-required p {
            margin: 0;
            color: #2563eb;
            font-weight: 500;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
        .signature {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Action Required: Case {{caseId}} Needs Attention</h1>
        </div>
        
        <div class="content">
            <p>Hi,</p>
            
            <p>Your case {{caseId}} has been returned and requires your attention.</p>
            
            <div class="case-details">
                <h3 style="margin-top: 0;">Case Details:</h3>
                <ul>
                    <li><strong>Claimant:</strong> {{claimantName}}</li>
                    <li><strong>Defendant:</strong> {{defendantName}}</li>
                    <li><strong>Judgment Amount:</strong> {{judgmentAmount}}</li>
                </ul>
            </div>
            
            <div class="return-reason">
                <p><strong>Reason for Return:</strong></p>
                <p>{{returnReason}}</p>
            </div>
            
            <div class="action-required">
                <p>Please log in to your dashboard, review the notes, make the necessary corrections, and resubmit your case.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Best regards,</p>
            <p class="signature"><strong>CourtLink Services Team</strong></p>
        </div>
    </div>
</body>
</html>`,

  "writ-received": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Writ Received</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #16a34a;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 20px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            margin: 20px 0;
        }
        .case-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .case-details ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .case-details li {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .case-details li:last-child {
            border-bottom: none;
        }
        .case-details strong {
            display: inline-block;
            width: 150px;
            color: #495057;
        }
        .next-steps {
            background-color: #e7f3ff;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .next-steps p {
            margin: 0;
            color: #2563eb;
            font-weight: 500;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
        .signature {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Writ Received - Case {{caseId}} Ready for Enforcement</h1>
        </div>
        
        <div class="content">
            <p>Hi {{hceoName}},</p>
            
            <p>Good news! The sealed writ for case {{caseId}} has been received.</p>
            
            <div class="case-details">
                <h3 style="margin-top: 0;">Case Details:</h3>
                <ul>
                    <li><strong>Claimant:</strong> {{claimantName}}</li>
                    <li><strong>Defendant:</strong> {{defendantName}}</li>
                    <li><strong>Judgment Amount:</strong> {{judgmentAmount}}</li>
                    <li><strong>Writ Received:</strong> {{writReceivedDate}}</li>
                </ul>
            </div>
            
            <div class="next-steps">
                <p>You may now proceed with enforcement proceedings.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Best regards,</p>
            <p class="signature"><strong>CourtLink Services Team</strong></p>
        </div>
    </div>
</body>
</html>`,

  "case-completed-admin": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Case Processing Complete</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #16a34a;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 20px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            margin: 20px 0;
        }
        .case-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .case-details ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .case-details li {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .case-details li:last-child {
            border-bottom: none;
        }
        .case-details strong {
            display: inline-block;
            width: 150px;
            color: #495057;
        }
        .next-steps {
            background-color: #e7f3ff;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .next-steps p {
            margin: 0;
            color: #2563eb;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
        .signature {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Case Processing Complete - {{caseId}}</h1>
        </div>
        
        <div class="content">
            <p>Hi there,</p>
            
            <p>Your case has been processed and completed by our admin team.</p>
            
            <div class="case-details">
                <h3 style="margin-top: 0;">Case Details:</h3>
                <ul>
                    <li><strong>Case ID:</strong> {{caseId}}</li>
                    <li><strong>Claimant Name:</strong> {{claimantName}}</li>
                    <li><strong>Defendant Name:</strong> {{defendantName}}</li>
                    <li><strong>Judgment Amount:</strong> {{judgmentAmount}}</li>
                    <li><strong>Completion Date:</strong> {{completionDate}}</li>
                    <li><strong>HCEO Officer:</strong> {{hceoName}}</li>
                    <li><strong>Status:</strong> {{status}}</li>
                </ul>
            </div>
            
            <div class="next-steps">
                <p>The case has been forwarded to the assigned HCEO officer for enforcement action. You will receive further updates as the case progresses.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Best regards,</p>
            <p class="signature"><strong>CourtLink Services Team</strong></p>
        </div>
    </div>
</body>
</html>`,

  "case-completed-hceo": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Case Enforcement Complete</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #16a34a;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 20px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            margin: 20px 0;
        }
        .case-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .case-details ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .case-details li {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .case-details li:last-child {
            border-bottom: none;
        }
        .case-details strong {
            display: inline-block;
            width: 150px;
            color: #495057;
        }
        .action-required {
            background-color: #e7f3ff;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .action-required p {
            margin: 0;
            color: #2563eb;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
        .signature {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Case Enforcement Complete - {{caseId}}</h1>
        </div>
        
        <div class="content">
            <p>Hi there,</p>
            
            <p>Your case enforcement has been completed by the HCEO officer.</p>
            
            <div class="case-details">
                <h3 style="margin-top: 0;">Case Details:</h3>
                <ul>
                    <li><strong>Case ID:</strong> {{caseId}}</li>
                    <li><strong>Claimant Name:</strong> {{claimantName}}</li>
                    <li><strong>Defendant Name:</strong> {{defendantName}}</li>
                    <li><strong>Judgment Amount:</strong> {{judgmentAmount}}</li>
                    <li><strong>Completion Date:</strong> {{completionDate}}</li>
                    <li><strong>HCEO Officer:</strong> {{hceoName}}</li>
                    <li><strong>Status:</strong> {{status}}</li>
                </ul>
            </div>
            
            <div class="action-required">
                <p>The enforcement action has been successfully completed. Please log in to your dashboard to view final documents and details.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Thank you for using CourtLink Services.</p>
            <p>Best regards,</p>
            <p class="signature"><strong>CourtLink Services Team</strong></p>
        </div>
    </div>
</body>
</html>`,

  "payment-added": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Received Notification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #16a34a;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 20px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            margin: 20px 0;
        }
        .case-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .case-details ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .case-details li {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .case-details li:last-child {
            border-bottom: none;
        }
        .case-details strong {
            display: inline-block;
            width: 150px;
            color: #495057;
        }
        .action-required {
            background-color: #e7f3ff;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .action-required p {
            margin: 0;
            color: #2563eb;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
        .signature {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Payment Recorded - {{caseId}}</h1>
        </div>
        
        <div class="content">
            <p>Hi there,</p>
            
            <p>A payment has been recorded for your case.</p>
            
            <div class="case-details">
                <h3 style="margin-top: 0;">Case Details:</h3>
                <ul>
                    <li><strong>Case ID:</strong> {{caseId}}</li>
                    <li><strong>Claimant Name:</strong> {{claimantName}}</li>
                    <li><strong>Defendant Name:</strong> {{defendantName}}</li>
                    <li><strong>Judgment Amount:</strong> {{judgmentAmount}}</li>
                    <li><strong>Payment Amount:</strong> {{paymentAmount}}</li>
                    <li><strong>Payment Date:</strong> {{paymentDate}}</li>
                    <li><strong>HCEO Officer:</strong> {{hceoName}}</li>
                </ul>
            </div>
            
            <div class="action-required">
                <p>You can view full payment history in your dashboard.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Best regards,</p>
            <p class="signature"><strong>CourtLink Services Team</strong></p>
        </div>
    </div>
</body>
</html>`,

  "hceo-assigned": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HCEO Case Assignment</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #2563eb;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 20px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            margin: 20px 0;
        }
        .case-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .case-details ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .case-details li {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .case-details li:last-child {
            border-bottom: none;
        }
        .case-details strong {
            display: inline-block;
            width: 150px;
            color: #495057;
        }
        .next-steps {
            background-color: #e7f3ff;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .next-steps h3 {
            margin-top: 0;
            color: #2563eb;
        }
        .next-steps ol {
            margin: 10px 0;
            padding-left: 20px;
        }
        .next-steps li {
            margin: 10px 0;
        }
        .action-required {
            background-color: #fef3c7;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .action-required p {
            margin: 0;
            color: #92400e;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
        .signature {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>You've Been Assigned to Case - {{caseId}}</h1>
        </div>
        
        <div class="content">
            <p>Hi {{hceoName}},</p>
            
            <p>You have been assigned to a new case. Please review the details below:</p>
            
            <div class="case-details">
                <h3 style="margin-top: 0;">Case Details:</h3>
                <ul>
                    <li><strong>Case ID:</strong> {{caseId}}</li>
                    <li><strong>Claimant Name:</strong> {{claimantName}}</li>
                    <li><strong>Defendant Name:</strong> {{defendantName}}</li>
                    <li><strong>Judgment Amount:</strong> {{judgmentAmount}}</li>
                    <li><strong>Current Status:</strong> {{status}}</li>
                    <li><strong>Assigned On:</strong> {{assignmentDate}}</li>
                </ul>
            </div>
            
            <div class="action-required">
                <p>Please log in to your dashboard to view complete case details and begin enforcement proceedings.</p>
            </div>
            
            <div class="next-steps">
                <h3>Next Steps:</h3>
                <ol>
                    <li>Review the case documentation</li>
                    <li>Verify defendant information</li>
                    <li>Proceed with enforcement actions</li>
                    <li>Update case status as proceedings progress</li>
                </ol>
            </div>
            
            <p>If you have any questions, please contact the admin team.</p>
        </div>
        
        <div class="footer">
            <p>Thank you for your service.</p>
            <p>Best regards,</p>
            <p class="signature"><strong>CourtLink Services Team</strong></p>
        </div>
    </div>
</body>
</html>`,

  "case-updated-admin": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Case Updated</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #f59e0b;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 20px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            margin: 20px 0;
        }
        .case-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .case-details ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .case-details li {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .case-details li:last-child {
            border-bottom: none;
        }
        .case-details strong {
            display: inline-block;
            width: 150px;
            color: #495057;
        }
        .changes-summary {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .changes-summary h3 {
            margin-top: 0;
            color: #92400e;
        }
        .changes-summary p {
            margin: 0;
            color: #78350f;
        }
        .action-required {
            background-color: #e7f3ff;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .action-required p {
            margin: 0;
            color: #2563eb;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
        .signature {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Case {{caseId}} Updated by Applicant</h1>
        </div>
        
        <div class="content">
            <p>Hi Admin,</p>
            
            <p>An applicant has updated a case in the system. Please review the changes below:</p>
            
            <div class="case-details">
                <h3 style="margin-top: 0;">Case Details:</h3>
                <ul>
                    <li><strong>Case ID:</strong> {{caseId}}</li>
                    <li><strong>Claimant Name:</strong> {{claimantName}}</li>
                    <li><strong>Defendant Name:</strong> {{defendantName}}</li>
                    <li><strong>Judgment Amount:</strong> {{judgmentAmount}}</li>
                    <li><strong>Current Status:</strong> {{status}}</li>
                    <li><strong>Updated By:</strong> {{applicantEmail}}</li>
                    <li><strong>Update Date:</strong> {{updateDate}}</li>
                </ul>
            </div>
            
            <div class="changes-summary">
                <h3>Changes Made ({{changesCount}} fields):</h3>
                <p>{{changesSummary}}</p>
            </div>
            
            <div class="action-required">
                <p>Please log in to your admin dashboard to view complete update details and take any necessary actions.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Best regards,</p>
            <p class="signature"><strong>CourtLink Services Team</strong></p>
        </div>
    </div>
</body>
</html>`,

  "user-created-by-admin": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Account Has Been Created</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #2563eb;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 20px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            margin: 20px 0;
        }
        .account-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .account-details ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .account-details li {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .account-details li:last-child {
            border-bottom: none;
        }
        .account-details strong {
            display: inline-block;
            width: 150px;
            color: #495057;
        }
        .credentials-box {
            background-color: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .credentials-box h3 {
            margin-top: 0;
            color: #856404;
        }
        .credentials-box p {
            margin: 8px 0;
            font-size: 16px;
        }
        .credentials-box .credential-label {
            font-weight: bold;
            color: #856404;
            display: inline-block;
            width: 100px;
        }
        .credentials-box .credential-value {
            font-family: 'Courier New', monospace;
            background-color: #fff;
            padding: 4px 8px;
            border-radius: 4px;
            color: #333;
        }
        .signin-button {
            display: inline-block;
            background-color: #2563eb;
            color: #fff;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: bold;
            text-align: center;
        }
        .signin-button:hover {
            background-color: #1d4ed8;
        }
        .security-note {
            background-color: #fef2f2;
            border-left: 4px solid #dc2626;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .security-note p {
            margin: 0;
            color: #991b1b;
            font-size: 14px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
        .signature {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Your Account Has Been Created</h1>
        </div>
        
        <div class="content">
            <p>Hi {{fullName}},</p>
            
            <p>An administrator has created an account for you on CourtLink Services. Your account is now ready to use!</p>
            
            <div class="account-details">
                <h3 style="margin-top: 0;">Account Information:</h3>
                <ul>
                    <li><strong>Created By:</strong> {{createdBy}}</li>
                    <li><strong>Role:</strong> {{role}}</li>
                    <li><strong>Account Created:</strong> {{creationDate}}</li>
                </ul>
            </div>
            
            <div class="credentials-box">
                <h3>Your Login Credentials:</h3>
                <p>
                    <span class="credential-label">Username:</span>
                    <span class="credential-value">{{username}}</span>
                </p>
                <p>
                    <span class="credential-label">Password:</span>
                    <span class="credential-value">{{password}}</span>
                </p>
            </div>
            
            <div class="security-note">
                <p><strong>⚠️ Security Notice:</strong> Please change your password after your first login for security purposes.</p>
            </div>
            
            <div style="text-align: center;">
                <a href="{{signinUrl}}" class="signin-button">Sign In to Your Account</a>
            </div>
            
            <p>You can access your account by clicking the button above or visiting: <a href="{{signinUrl}}">{{signinUrl}}</a></p>
            
            <p>If you have any questions or need assistance, please contact the administrator who created your account.</p>
        </div>
        
        <div class="footer">
            <p>Best regards,</p>
            <p class="signature"><strong>CourtLink Services Team</strong></p>
        </div>
    </div>
</body>
</html>`
};
