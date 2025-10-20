// ClientFlow AI Suite - Data Export/Import System
// Complete data portability with CSV, Excel, and JSON support

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const csv = require('csv-writer');
const ExcelJS = require('exceljs');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

// Export contacts to CSV
router.get('/export/contacts/csv', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'];
    
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    // Get contacts
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select(`
        *,
        deals (id, title, stage, value_cents),
        messages (id, channel, direction, body, created_at)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Prepare CSV data
    const csvData = contacts.map(contact => ({
      'First Name': contact.first_name,
      'Last Name': contact.last_name,
      'Email': contact.email,
      'Phone': contact.phone,
      'Company': contact.company,
      'Title': contact.title,
      'Tags': contact.tags?.join(', ') || '',
      'Source': contact.source,
      'Status': contact.status,
      'Total Deals': contact.deals?.length || 0,
      'Total Revenue': contact.deals?.reduce((sum, deal) => 
        deal.stage === 'won' ? sum + deal.value_cents : sum, 0) / 100 || 0,
      'Last Contact': contact.last_contact_at,
      'Created': contact.created_at,
      'Updated': contact.updated_at
    }));

    // Generate CSV
    const csvWriter = csv.createObjectCsvWriter({
      path: 'contacts_export.csv',
      header: Object.keys(csvData[0] || {}).map(key => ({ id: key, title: key }))
    });

    await csvWriter.writeRecords(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts_export.csv"');
    res.send(csvData.map(row => Object.values(row).join(',')).join('\n'));
  } catch (error) {
    console.error('Error exporting contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export contacts'
    });
  }
});

// Export deals to Excel
router.get('/export/deals/excel', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'];
    
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    // Get deals with contact information
    const { data: deals, error } = await supabase
      .from('deals')
      .select(`
        *,
        contacts (first_name, last_name, email, phone, company)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Deals');

    // Add headers
    worksheet.columns = [
      { header: 'Deal Title', key: 'title', width: 30 },
      { header: 'Contact Name', key: 'contact_name', width: 25 },
      { header: 'Contact Email', key: 'contact_email', width: 30 },
      { header: 'Contact Phone', key: 'contact_phone', width: 20 },
      { header: 'Company', key: 'company', width: 25 },
      { header: 'Stage', key: 'stage', width: 15 },
      { header: 'Value', key: 'value', width: 15 },
      { header: 'Probability', key: 'probability', width: 15 },
      { header: 'Expected Close', key: 'expected_close', width: 20 },
      { header: 'Created', key: 'created_at', width: 20 },
      { header: 'Updated', key: 'updated_at', width: 20 }
    ];

    // Add data
    deals.forEach(deal => {
      worksheet.addRow({
        title: deal.title,
        contact_name: `${deal.contacts?.first_name || ''} ${deal.contacts?.last_name || ''}`.trim(),
        contact_email: deal.contacts?.email || '',
        contact_phone: deal.contacts?.phone || '',
        company: deal.contacts?.company || '',
        stage: deal.stage,
        value: deal.value_cents / 100,
        probability: deal.probability,
        expected_close: deal.expected_close_date,
        created_at: deal.created_at,
        updated_at: deal.updated_at
      });
    });

    // Style the worksheet
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="deals_export.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting deals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export deals'
    });
  }
});

// Export messages to JSON
router.get('/export/messages/json', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'];
    const { startDate, endDate, channel } = req.query;
    
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    let query = supabase
      .from('messages')
      .select(`
        *,
        contacts (first_name, last_name, email, phone)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (channel) {
      query = query.eq('channel', channel);
    }

    const { data: messages, error } = await query;

    if (error) throw error;

    // Format data for export
    const exportData = {
      export_info: {
        organization_id: orgId,
        export_date: new Date().toISOString(),
        total_messages: messages.length,
        date_range: {
          start: startDate || 'all',
          end: endDate || 'all'
        },
        channel_filter: channel || 'all'
      },
      messages: messages.map(message => ({
        id: message.id,
        contact_name: `${message.contacts?.first_name || ''} ${message.contacts?.last_name || ''}`.trim(),
        contact_email: message.contacts?.email || '',
        contact_phone: message.contacts?.phone || '',
        channel: message.channel,
        direction: message.direction,
        from_address: message.from_addr,
        to_address: message.to_addr,
        body: message.body,
        status: message.status,
        created_at: message.created_at,
        updated_at: message.updated_at
      }))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="messages_export.json"');
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export messages'
    });
  }
});

// Import contacts from CSV
router.post('/import/contacts/csv', upload.single('file'), async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'];
    
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'CSV file required'
      });
    }

    // Parse CSV
    const csvContent = req.file.buffer.toString('utf-8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const contacts = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const contact = {};
        
        headers.forEach((header, index) => {
          const value = values[index] || '';
          switch (header.toLowerCase()) {
            case 'first name':
            case 'firstname':
              contact.first_name = value;
              break;
            case 'last name':
            case 'lastname':
              contact.last_name = value;
              break;
            case 'email':
              contact.email = value;
              break;
            case 'phone':
              contact.phone = value;
              break;
            case 'company':
              contact.company = value;
              break;
            case 'title':
              contact.title = value;
              break;
            case 'tags':
              contact.tags = value ? value.split(',').map(t => t.trim()) : [];
              break;
            case 'source':
              contact.source = value;
              break;
            case 'status':
              contact.status = value;
              break;
          }
        });
        
        if (contact.first_name || contact.email) {
          contact.organization_id = orgId;
          contact.created_at = new Date().toISOString();
          contact.updated_at = new Date().toISOString();
          contacts.push(contact);
        }
      }
    }

    // Insert contacts
    const { data: insertedContacts, error } = await supabase
      .from('contacts')
      .insert(contacts)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      data: {
        imported_count: insertedContacts.length,
        contacts: insertedContacts
      }
    });
  } catch (error) {
    console.error('Error importing contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import contacts'
    });
  }
});

// Import deals from Excel
router.post('/import/deals/excel', upload.single('file'), async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'];
    
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Excel file required'
      });
    }

    // Parse Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    
    const worksheet = workbook.getWorksheet(1);
    const deals = [];
    
    // Skip header row
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const deal = {
        organization_id: orgId,
        title: row.getCell(1).value?.toString() || '',
        stage: row.getCell(2).value?.toString() || 'lead',
        value_cents: Math.round((row.getCell(3).value || 0) * 100),
        probability: row.getCell(4).value || 0,
        expected_close_date: row.getCell(5).value ? new Date(row.getCell(5).value).toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (deal.title) {
        deals.push(deal);
      }
    }

    // Insert deals
    const { data: insertedDeals, error } = await supabase
      .from('deals')
      .insert(deals)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      data: {
        imported_count: insertedDeals.length,
        deals: insertedDeals
      }
    });
  } catch (error) {
    console.error('Error importing deals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import deals'
    });
  }
});

// Get export/import history
router.get('/history', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'];
    
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    const { data: history, error } = await supabase
      .from('data_export_import_history')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({
      success: true,
      data: history || []
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch export/import history'
    });
  }
});

// GDPR data export (complete user data)
router.get('/gdpr/export', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'];
    
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    // Get all organization data
    const [contacts, deals, messages, appointments, teamMembers] = await Promise.all([
      supabase.from('contacts').select('*').eq('organization_id', orgId),
      supabase.from('deals').select('*').eq('organization_id', orgId),
      supabase.from('messages').select('*').eq('organization_id', orgId),
      supabase.from('appointments').select('*').eq('organization_id', orgId),
      supabase.from('organization_members').select('*').eq('organization_id', orgId)
    ]);

    const gdprData = {
      export_info: {
        organization_id: orgId,
        export_date: new Date().toISOString(),
        purpose: 'GDPR Data Portability Request',
        data_types: ['contacts', 'deals', 'messages', 'appointments', 'team_members']
      },
      data: {
        contacts: contacts.data || [],
        deals: deals.data || [],
        messages: messages.data || [],
        appointments: appointments.data || [],
        team_members: teamMembers.data || []
      },
      summary: {
        total_contacts: contacts.data?.length || 0,
        total_deals: deals.data?.length || 0,
        total_messages: messages.data?.length || 0,
        total_appointments: appointments.data?.length || 0,
        total_team_members: teamMembers.data?.length || 0
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="gdpr_data_export.json"');
    res.json(gdprData);
  } catch (error) {
    console.error('Error creating GDPR export:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create GDPR data export'
    });
  }
});

module.exports = router;
