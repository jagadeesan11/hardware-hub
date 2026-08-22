import { PrismaClient, Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Dev-only credentials. Never seed these into a production database. */
const ADMIN = { email: 'admin@hardwarehub.test', password: 'Admin@12345', name: 'App Owner' };
const SHOP_OWNER = {
  email: 'shopowner@hardwarehub.test',
  password: 'ShopOwner@12345',
  name: 'Shop Owner',
};
const CUSTOMER = {
  email: 'customer@hardwarehub.test',
  password: 'Customer@12345',
  name: 'Ravi Kumar',
};

type CategorySeed = { name: string; slug: string; children?: { name: string; slug: string }[] };

const CATEGORIES: CategorySeed[] = [
  {
    name: 'Doors',
    slug: 'doors',
    children: [
      { name: 'Wooden Doors', slug: 'wooden-doors' },
      { name: 'Flush Doors', slug: 'flush-doors' },
      { name: 'PVC Doors', slug: 'pvc-doors' },
    ],
  },
  {
    name: 'PVC Panels',
    slug: 'pvc-panels',
    children: [
      { name: 'Wall Panels', slug: 'wall-panels' },
      { name: 'Ceiling Panels', slug: 'ceiling-panels' },
    ],
  },
  {
    name: 'Paints',
    slug: 'paints',
    children: [
      { name: 'Interior Emulsion', slug: 'interior-emulsion' },
      { name: 'Exterior Paint', slug: 'exterior-paint' },
      { name: 'Wood Finishes', slug: 'wood-finishes' },
    ],
  },
  {
    name: 'Hardware Accessories',
    slug: 'hardware-accessories',
    children: [
      { name: 'Locks and Latches', slug: 'locks-and-latches' },
      { name: 'Hinges', slug: 'hinges' },
      { name: 'Handles and Knobs', slug: 'handles-and-knobs' },
    ],
  },
  {
    name: 'Wood Hardware',
    slug: 'wood-hardware',
    children: [
      { name: 'Plywood', slug: 'plywood' },
      { name: 'Laminates', slug: 'laminates' },
    ],
  },
];

type ProductSeed = {
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  price: number;
  stockQty: number;
  sku: string;
  size?: string;
  material?: string;
};

// Prices are INR, typical of an Indian hardware retailer.
const PRODUCTS: ProductSeed[] = [
  // --- Doors ---
  {
    name: 'Teak Wood Panel Door 32mm',
    slug: 'teak-wood-panel-door-32mm',
    categorySlug: 'wooden-doors',
    description: 'Solid Burma teak panel door with natural grain finish. Seasoned and termite-treated.',
    price: 18500,
    stockQty: 12,
    sku: 'DR-TEAK-32',
    size: '7ft x 3ft',
    material: 'Burma Teak',
  },
  {
    name: 'Sal Wood Door Frame',
    slug: 'sal-wood-door-frame',
    categorySlug: 'wooden-doors',
    description: 'Pre-finished Sal wood frame, ready to fit. Straight-grain and warp-resistant.',
    price: 6200,
    stockQty: 24,
    sku: 'DR-SAL-FRM',
    size: '7ft x 3.5ft',
    material: 'Sal Wood',
  },
  {
    name: 'Century Flush Door 30mm',
    slug: 'century-flush-door-30mm',
    categorySlug: 'flush-doors',
    description: 'Solid core commercial flush door with hardwood battens. BWR grade.',
    price: 4850,
    stockQty: 40,
    sku: 'DR-FLSH-30',
    size: '7ft x 3ft',
    material: 'Hardwood Core',
  },
  {
    name: 'Waterproof Flush Door BWP',
    slug: 'waterproof-flush-door-bwp',
    categorySlug: 'flush-doors',
    description: 'Boiling waterproof flush door for bathrooms and wet areas.',
    price: 5900,
    stockQty: 18,
    sku: 'DR-FLSH-BWP',
    size: '7ft x 2.5ft',
    material: 'BWP Plywood',
  },
  {
    name: 'PVC Bathroom Door',
    slug: 'pvc-bathroom-door',
    categorySlug: 'pvc-doors',
    description: 'Lightweight moisture-proof PVC door. Zero swelling, no repainting needed.',
    price: 2400,
    stockQty: 55,
    sku: 'DR-PVC-BTH',
    size: '6.5ft x 2.5ft',
    material: 'PVC',
  },
  {
    name: 'PVC Door with Glass Insert',
    slug: 'pvc-door-with-glass-insert',
    categorySlug: 'pvc-doors',
    description: 'PVC door with frosted acrylic insert for balanced light and privacy.',
    price: 3100,
    stockQty: 20,
    sku: 'DR-PVC-GLS',
    size: '6.5ft x 2.5ft',
    material: 'PVC + Acrylic',
  },

  // --- PVC Panels ---
  {
    name: 'PVC Wall Panel Marble Finish',
    slug: 'pvc-wall-panel-marble-finish',
    categorySlug: 'wall-panels',
    description: 'Interlocking wall panel with high-gloss marble print. Wipe-clean surface.',
    price: 185,
    stockQty: 400,
    sku: 'PN-WAL-MRB',
    size: '8ft x 1ft',
    material: 'PVC',
  },
  {
    name: 'PVC Wall Panel Wood Grain',
    slug: 'pvc-wall-panel-wood-grain',
    categorySlug: 'wall-panels',
    description: 'Textured wood-grain wall cladding. Waterproof and termite-proof.',
    price: 165,
    stockQty: 380,
    sku: 'PN-WAL-WD',
    size: '8ft x 1ft',
    material: 'PVC',
  },
  {
    name: 'PVC Ceiling Panel Matte White',
    slug: 'pvc-ceiling-panel-matte-white',
    categorySlug: 'ceiling-panels',
    description: 'Lightweight false-ceiling panel with concealed joints.',
    price: 145,
    stockQty: 500,
    sku: 'PN-CEL-WHT',
    size: '10ft x 1ft',
    material: 'PVC',
  },
  {
    name: 'PVC Ceiling Panel Designer',
    slug: 'pvc-ceiling-panel-designer',
    categorySlug: 'ceiling-panels',
    description: 'Embossed designer ceiling panel for living and dining rooms.',
    price: 220,
    stockQty: 150,
    sku: 'PN-CEL-DSG',
    size: '10ft x 1ft',
    material: 'PVC',
  },

  // --- Paints ---
  {
    name: 'Royale Luxury Interior Emulsion 20L',
    slug: 'royale-luxury-interior-emulsion-20l',
    categorySlug: 'interior-emulsion',
    description: 'Premium interior emulsion with a rich sheen and low VOC content.',
    price: 8200,
    stockQty: 30,
    sku: 'PT-ROY-20',
    size: '20 Litre',
    material: 'Acrylic Emulsion',
  },
  {
    name: 'Easy Clean Interior Emulsion 10L',
    slug: 'easy-clean-interior-emulsion-10l',
    categorySlug: 'interior-emulsion',
    description: 'Stain-resistant interior emulsion. Marks wipe off with a damp cloth.',
    price: 3450,
    stockQty: 45,
    sku: 'PT-BRG-10',
    size: '10 Litre',
    material: 'Acrylic Emulsion',
  },
  {
    name: 'Ultima Weatherproof Exterior Paint 20L',
    slug: 'ultima-weatherproof-exterior-paint-20l',
    categorySlug: 'exterior-paint',
    description: 'Weatherproof exterior paint rated for eight years of performance.',
    price: 9600,
    stockQty: 22,
    sku: 'PT-APX-20',
    size: '20 Litre',
    material: 'Acrylic',
  },
  {
    name: 'Weather Shield Exterior Primer 10L',
    slug: 'weather-shield-exterior-primer-10l',
    categorySlug: 'exterior-paint',
    description: 'Alkali-resistant exterior primer for fresh masonry.',
    price: 2800,
    stockQty: 38,
    sku: 'PT-WSP-10',
    size: '10 Litre',
    material: 'Primer',
  },
  {
    name: 'Melamine Wood Polish 4L',
    slug: 'melamine-wood-polish-4l',
    categorySlug: 'wood-finishes',
    description: 'Two-pack melamine finish giving furniture a durable matte sheen.',
    price: 2150,
    stockQty: 26,
    sku: 'PT-MEL-4',
    size: '4 Litre',
    material: 'Melamine',
  },
  {
    name: 'PU Clear Wood Coating 4L',
    slug: 'pu-clear-wood-coating-4l',
    categorySlug: 'wood-finishes',
    description: 'Polyurethane clear coat with excellent scratch resistance.',
    price: 3400,
    stockQty: 15,
    sku: 'PT-PU-4',
    size: '4 Litre',
    material: 'Polyurethane',
  },

  // --- Hardware Accessories ---
  {
    name: 'Seven Lever Mortise Lock Set',
    slug: 'seven-lever-mortise-lock-set',
    categorySlug: 'locks-and-latches',
    description: 'Seven-lever mortise lock set with brass-finish handles and three keys.',
    price: 2650,
    stockQty: 60,
    sku: 'HW-LCK-7LV',
    material: 'Brass and Steel',
  },
  {
    name: 'Stainless Steel Tower Bolt 8 inch',
    slug: 'stainless-steel-tower-bolt-8-inch',
    categorySlug: 'locks-and-latches',
    description: 'Heavy-duty SS-304 tower bolt. Rust-free with concealed screws.',
    price: 320,
    stockQty: 200,
    sku: 'HW-BLT-8',
    size: '8 inch',
    material: 'SS 304',
  },
  {
    name: 'Soft-Close Cabinet Hinge Pair',
    slug: 'soft-close-cabinet-hinge-pair',
    categorySlug: 'hinges',
    description: 'Hydraulic soft-close hinge pair rated for 50,000 cycles.',
    price: 240,
    stockQty: 320,
    sku: 'HW-HNG-SC',
    material: 'Nickel-plated Steel',
  },
  {
    name: 'SS Butt Hinge 4 inch Set of 3',
    slug: 'ss-butt-hinge-4-inch-set-of-3',
    categorySlug: 'hinges',
    description: 'Stainless steel butt hinges for main doors. Ball-bearing pivots.',
    price: 480,
    stockQty: 140,
    sku: 'HW-HNG-BT4',
    size: '4 inch',
    material: 'SS 304',
  },
  {
    name: 'Brass Main Door Handle 12 inch',
    slug: 'brass-main-door-handle-12-inch',
    categorySlug: 'handles-and-knobs',
    description: 'Solid brass pull handle with antique finish. Sold as a pair.',
    price: 1850,
    stockQty: 48,
    sku: 'HW-HDL-BR12',
    size: '12 inch',
    material: 'Solid Brass',
  },
  {
    name: 'Aluminium Cabinet Knob Pack of 10',
    slug: 'aluminium-cabinet-knob-pack-of-10',
    categorySlug: 'handles-and-knobs',
    description: 'Matte-finish aluminium knobs for wardrobes and kitchen shutters.',
    price: 590,
    stockQty: 90,
    sku: 'HW-KNB-AL10',
    material: 'Aluminium',
  },

  // --- Wood Hardware ---
  {
    name: 'Marine Grade Plywood 19mm',
    slug: 'marine-grade-plywood-19mm',
    categorySlug: 'plywood',
    description: 'IS:710 marine-grade plywood for kitchens and wet areas. Boiling waterproof.',
    price: 3850,
    stockQty: 65,
    sku: 'WD-PLY-M19',
    size: '8ft x 4ft',
    material: 'Marine Plywood',
  },
  {
    name: 'Commercial Plywood 12mm',
    slug: 'commercial-plywood-12mm',
    categorySlug: 'plywood',
    description: 'MR-grade commercial plywood for interior furniture and partitions.',
    price: 1950,
    stockQty: 110,
    sku: 'WD-PLY-C12',
    size: '8ft x 4ft',
    material: 'MR Plywood',
  },
  {
    name: 'Decorative Laminate Sheet 1mm',
    slug: 'decorative-laminate-sheet-1mm',
    categorySlug: 'laminates',
    description: 'Scratch-resistant decorative laminate in a matte woodgrain finish.',
    price: 1450,
    stockQty: 130,
    sku: 'WD-LAM-M1',
    size: '8ft x 4ft',
    material: 'Laminate',
  },
  {
    name: 'High Gloss Acrylic Laminate',
    slug: 'high-gloss-acrylic-laminate',
    categorySlug: 'laminates',
    description: 'Mirror-finish acrylic laminate for modular kitchen shutters.',
    price: 2900,
    stockQty: 40,
    sku: 'WD-LAM-ACR',
    size: '8ft x 4ft',
    material: 'Acrylic',
  },
];

async function main() {
  console.log('Seeding database...\n');

  // Idempotent: upsert by slug, so re-running never duplicates rows or wipes
  // orders that already reference these products.
  const idBySlug = new Map<string, string>();
  let categoryCount = 0;

  for (const parent of CATEGORIES) {
    const created = await prisma.category.upsert({
      where: { slug: parent.slug },
      update: { name: parent.name },
      create: { name: parent.name, slug: parent.slug },
    });
    idBySlug.set(parent.slug, created.id);
    categoryCount++;

    for (const child of parent.children ?? []) {
      const createdChild = await prisma.category.upsert({
        where: { slug: child.slug },
        update: { name: child.name, parentId: created.id },
        create: { name: child.name, slug: child.slug, parentId: created.id },
      });
      idBySlug.set(child.slug, createdChild.id);
      categoryCount++;
    }
  }
  console.log(`  categories: ${categoryCount}`);

  for (const product of PRODUCTS) {
    const categoryId = idBySlug.get(product.categorySlug);
    if (!categoryId) throw new Error(`Unknown category slug: ${product.categorySlug}`);

    const data = {
      name: product.name,
      categoryId,
      description: product.description,
      price: new Prisma.Decimal(product.price),
      stockQty: product.stockQty,
      sku: product.sku,
      size: product.size ?? null,
      material: product.material ?? null,
      images: [] as string[],
      isActive: true,
    };

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: data,
      create: { ...data, slug: product.slug },
    });
  }
  console.log(`  products:   ${PRODUCTS.length}`);

  await prisma.user.upsert({
    where: { email: ADMIN.email },
    update: { role: Role.ADMIN },
    create: {
      name: ADMIN.name,
      email: ADMIN.email,
      passwordHash: await bcrypt.hash(ADMIN.password, 12),
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: SHOP_OWNER.email },
    update: { role: Role.SHOP_OWNER },
    create: {
      name: SHOP_OWNER.name,
      email: SHOP_OWNER.email,
      passwordHash: await bcrypt.hash(SHOP_OWNER.password, 12),
      role: Role.SHOP_OWNER,
    },
  });

  await prisma.user.upsert({
    where: { email: CUSTOMER.email },
    update: {},
    create: {
      name: CUSTOMER.name,
      email: CUSTOMER.email,
      passwordHash: await bcrypt.hash(CUSTOMER.password, 12),
      phone: '9876543210',
      role: Role.CUSTOMER,
    },
  });
  console.log('  users:      3\n');

  console.log('Test accounts (development only):');
  console.log(`  app owner   ${ADMIN.email} / ${ADMIN.password}`);
  console.log(`  shop owner  ${SHOP_OWNER.email} / ${SHOP_OWNER.password}`);
  console.log(`  customer    ${CUSTOMER.email} / ${CUSTOMER.password}\n`);
  console.log('Done.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
