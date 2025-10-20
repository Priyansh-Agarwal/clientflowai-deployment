import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo organization
  const org = await prisma.organization.create({
    data: {
      name: 'ClientFlow Demo',
    },
  });
  console.log('✅ Created organization:', org.name);

  // Create demo user
  const user = await prisma.user.create({
    data: {
      email: 'demo@clientflow.test',
      name: 'Demo User',
    },
  });
  console.log('✅ Created user:', user.email);

  // Create membership (owner)
  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      orgId: org.id,
      role: 'owner',
    },
  });
  console.log('✅ Created membership:', membership.role);

  // Create contacts
  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        orgId: org.id,
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '+1-555-0101',
        tags: ['vip', 'enterprise'],
      },
    }),
    prisma.contact.create({
      data: {
        orgId: org.id,
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@example.com',
        phone: '+1-555-0102',
        tags: ['prospect', 'small-business'],
      },
    }),
    prisma.contact.create({
      data: {
        orgId: org.id,
        firstName: 'Mike',
        lastName: 'Wilson',
        email: 'mike.wilson@example.com',
        phone: '+1-555-0103',
        tags: ['lead', 'startup'],
      },
    }),
    prisma.contact.create({
      data: {
        orgId: org.id,
        firstName: 'Emily',
        lastName: 'Davis',
        email: 'emily.davis@example.com',
        phone: '+1-555-0104',
        tags: ['customer', 'renewal'],
      },
    }),
    prisma.contact.create({
      data: {
        orgId: org.id,
        firstName: 'David',
        lastName: 'Brown',
        email: 'david.brown@example.com',
        phone: '+1-555-0105',
        tags: ['prospect', 'enterprise'],
      },
    }),
    prisma.contact.create({
      data: {
        orgId: org.id,
        firstName: 'Lisa',
        lastName: 'Garcia',
        email: 'lisa.garcia@example.com',
        phone: '+1-555-0106',
        tags: ['customer', 'support'],
      },
    }),
    prisma.contact.create({
      data: {
        orgId: org.id,
        firstName: 'Robert',
        lastName: 'Martinez',
        email: 'robert.martinez@example.com',
        phone: '+1-555-0107',
        tags: ['lead', 'qualified'],
      },
    }),
    prisma.contact.create({
      data: {
        orgId: org.id,
        firstName: 'Jennifer',
        lastName: 'Anderson',
        email: 'jennifer.anderson@example.com',
        phone: '+1-555-0108',
        tags: ['prospect', 'enterprise'],
      },
    }),
    prisma.contact.create({
      data: {
        orgId: org.id,
        firstName: 'William',
        lastName: 'Taylor',
        email: 'william.taylor@example.com',
        phone: '+1-555-0109',
        tags: ['customer', 'vip'],
      },
    }),
    prisma.contact.create({
      data: {
        orgId: org.id,
        firstName: 'Amanda',
        lastName: 'Thomas',
        email: 'amanda.thomas@example.com',
        phone: '+1-555-0110',
        tags: ['lead', 'startup'],
      },
    }),
  ]);
  console.log('✅ Created contacts:', contacts.length);

  // Create deals across different stages
  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        orgId: org.id,
        contactId: contacts[0].id,
        title: 'Enterprise CRM Implementation',
        stage: 'proposal',
        valueCents: 5000000, // $50,000
        currency: 'USD',
      },
    }),
    prisma.deal.create({
      data: {
        orgId: org.id,
        contactId: contacts[1].id,
        title: 'Small Business Package',
        stage: 'qualified',
        valueCents: 500000, // $5,000
        currency: 'USD',
      },
    }),
    prisma.deal.create({
      data: {
        orgId: org.id,
        contactId: contacts[2].id,
        title: 'Startup Basic Plan',
        stage: 'lead',
        valueCents: 100000, // $1,000
        currency: 'USD',
      },
    }),
    prisma.deal.create({
      data: {
        orgId: org.id,
        contactId: contacts[3].id,
        title: 'Renewal - Premium Package',
        stage: 'won',
        valueCents: 1200000, // $12,000
        currency: 'USD',
      },
    }),
    prisma.deal.create({
      data: {
        orgId: org.id,
        contactId: contacts[4].id,
        title: 'Enterprise Migration',
        stage: 'lost',
        valueCents: 3000000, // $30,000
        currency: 'USD',
      },
    }),
  ]);
  console.log('✅ Created deals:', deals.length);

  // Create future appointments
  const now = new Date();
  const appointments = await Promise.all([
    prisma.appointment.create({
      data: {
        orgId: org.id,
        contactId: contacts[0].id,
        startsAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        endsAt: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
        status: 'confirmed',
        location: 'Conference Room A',
      },
    }),
    prisma.appointment.create({
      data: {
        orgId: org.id,
        contactId: contacts[1].id,
        startsAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        endsAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // Day after tomorrow + 30 min
        status: 'pending',
        location: 'Video Call',
      },
    }),
    prisma.appointment.create({
      data: {
        orgId: org.id,
        contactId: contacts[2].id,
        startsAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        endsAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000), // 3 days from now + 45 min
        status: 'confirmed',
        location: 'Office Visit',
      },
    }),
    prisma.appointment.create({
      data: {
        orgId: org.id,
        contactId: contacts[3].id,
        startsAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        endsAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 5 days from now + 1 hour
        status: 'pending',
        location: 'Client Office',
      },
    }),
    prisma.appointment.create({
      data: {
        orgId: org.id,
        contactId: contacts[4].id,
        startsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // 7 days from now + 1.5 hours
        status: 'confirmed',
        location: 'Video Call',
      },
    }),
  ]);
  console.log('✅ Created appointments:', appointments.length);

  // Create automation configurations
  const automations = await Promise.all([
    prisma.automation.create({
      data: {
        orgId: org.id,
        name: 'Booking Confirmation',
        type: 'booking',
        config: {
          trigger: 'appointment_created',
          actions: [
            {
              type: 'send_email',
              template: 'booking_confirmation',
              delay: 0,
            },
            {
              type: 'send_sms',
              template: 'booking_reminder',
              delay: 24 * 60 * 60 * 1000, // 24 hours before
            },
          ],
        },
        isEnabled: true,
      },
    }),
    prisma.automation.create({
      data: {
        orgId: org.id,
        name: 'Follow-up Reminder',
        type: 'reminder',
        config: {
          trigger: 'appointment_completed',
          actions: [
            {
              type: 'create_task',
              title: 'Follow up with client',
              dueDate: '+3 days',
            },
            {
              type: 'send_email',
              template: 'follow_up',
              delay: 2 * 24 * 60 * 60 * 1000, // 2 days after
            },
          ],
        },
        isEnabled: true,
      },
    }),
  ]);
  console.log('✅ Created automations:', automations.length);

  // Create some sample activities
  const activities = await Promise.all([
    prisma.activity.create({
      data: {
        orgId: org.id,
        contactId: contacts[0].id,
        dealId: deals[0].id,
        type: 'call',
        content: 'Initial discovery call completed. Client interested in enterprise features.',
        meta: {
          duration: 45,
          outcome: 'positive',
        },
      },
    }),
    prisma.activity.create({
      data: {
        orgId: org.id,
        contactId: contacts[1].id,
        dealId: deals[1].id,
        type: 'email',
        content: 'Sent proposal document for small business package.',
        meta: {
          subject: 'Proposal: Small Business CRM Package',
          attachments: ['proposal.pdf'],
        },
      },
    }),
    prisma.activity.create({
      data: {
        orgId: org.id,
        contactId: contacts[2].id,
        type: 'note',
        content: 'Lead qualified through website form. Interested in basic plan.',
        meta: {
          source: 'website',
          score: 8,
        },
      },
    }),
  ]);
  console.log('✅ Created activities:', activities.length);

  // Create sample daily metrics for the last 7 days
  const dailyMetrics = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const metric = await prisma.dailyMetric.create({
      data: {
        date: date,
        orgId: org.id,
        leads: Math.floor(Math.random() * 5) + 1,
        dealsWon: Math.floor(Math.random() * 3),
        revenueCents: Math.floor(Math.random() * 100000) + 10000,
        showRate: Math.random() * 0.3 + 0.7, // 70-100%
      },
    });
    dailyMetrics.push(metric);
  }
  console.log('✅ Created daily metrics:', dailyMetrics.length);

  console.log('🎉 Database seed completed successfully!');
  console.log(`📊 Summary:`);
  console.log(`   - Organizations: 1`);
  console.log(`   - Users: 1`);
  console.log(`   - Memberships: 1`);
  console.log(`   - Contacts: ${contacts.length}`);
  console.log(`   - Deals: ${deals.length}`);
  console.log(`   - Appointments: ${appointments.length}`);
  console.log(`   - Automations: ${automations.length}`);
  console.log(`   - Activities: ${activities.length}`);
  console.log(`   - Daily Metrics: ${dailyMetrics.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

