import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const PRODUCT_DIR = '/home/z/my-project/public/images/products';
const CATEGORY_DIR = '/home/z/my-project/public/images/categories';

const IMAGES = [
  // Men's Accessories
  { path: `${PRODUCT_DIR}/men-acc-1.jpg`, prompt: "Luxury cufflink set in walnut presentation box, mother-of-pearl onyx and lapis lazuli cufflinks in sterling silver, professional product photography on dark velvet, luxury e-commerce, studio lighting" },
  { path: `${PRODUCT_DIR}/men-acc-2.jpg`, prompt: "Italian leather belt with brushed palladium buckle, full-grain dark brown leather, professional product photography, luxury e-commerce, studio lighting on dark background" },
  { path: `${PRODUCT_DIR}/men-acc-3.jpg`, prompt: "Silk pocket square collection, 5 hand-rolled silk pocket squares in leather keepsake box, paisley and geometric patterns, professional product photography, luxury e-commerce" },
  
  // Women's Accessories
  { path: `${PRODUCT_DIR}/women-acc-1.jpg`, prompt: "Silk scarf collection, 3 mulberry silk scarves in complementary prints, geometric floral abstract patterns, professional product photography, luxury e-commerce, studio lighting" },
  { path: `${PRODUCT_DIR}/women-acc-2.jpg`, prompt: "Designer oversized cat-eye sunglasses, hand-polished acetate, gold temple accents, professional product photography, luxury fashion e-commerce, dark background" },
  { path: `${PRODUCT_DIR}/women-acc-3.jpg`, prompt: "Pearl handbag clutch, evening clutch covered in hand-sewn freshwater pearls, gold-tone frame clasp, professional product photography, luxury e-commerce, dark background" },
  
  // Stationery
  { path: `${PRODUCT_DIR}/stationery-1.jpg`, prompt: "Premium leather journal, hand-stitched full-grain leather with wrap-around tie and gilt edges, professional product photography, luxury e-commerce, dark background" },
  { path: `${PRODUCT_DIR}/stationery-2.jpg`, prompt: "Gold fountain pen set in velvet-lined lacquer box, 24K gold plated brass, professional product photography, luxury e-commerce, studio lighting" },
  { path: `${PRODUCT_DIR}/stationery-3.jpg`, prompt: "Wax seal kit with brass seal handle, interchangeable monogram die and sealing wax sticks, professional product photography, luxury e-commerce" },
  
  // Desk Accessories
  { path: `${PRODUCT_DIR}/desk-1.jpg`, prompt: "Crystal desk organizer with hand-cut facets, lead crystal with multiple compartments, professional product photography, luxury e-commerce, dark background" },
  { path: `${PRODUCT_DIR}/desk-2.jpg`, prompt: "Italian leather desk pad, full-grain leather with felt backing and stitched edges, cognac color, professional product photography, luxury e-commerce" },
  { path: `${PRODUCT_DIR}/desk-3.jpg`, prompt: "Magnetic hourglass timer with iron-filing sand, brushed copper frame with glass body, professional product photography, luxury e-commerce" },
  
  // Corporate Gifts
  { path: `${PRODUCT_DIR}/corp-gift-1.jpg`, prompt: "Executive gift hamper with premium items in luxury box, chocolates and wine and leather goods, professional product photography, luxury corporate gifting, dark background" },
  { path: `${PRODUCT_DIR}/corp-gift-2.jpg`, prompt: "Premium pen and watch gift set in wooden presentation box, professional product photography, luxury corporate gifting e-commerce, studio lighting" },
  { path: `${PRODUCT_DIR}/corp-gift-3.jpg`, prompt: "Luxury welcome kit with branded items in elegant box, notebook pen and accessories, professional product photography, corporate gifting e-commerce" },
  
  // Kids Fashion
  { path: `${PRODUCT_DIR}/kids-fashion-1.jpg`, prompt: "Designer kids sherwani set, traditional Indian formal wear for children, professional product photography, luxury kids fashion e-commerce" },
  { path: `${PRODUCT_DIR}/kids-fashion-2.jpg`, prompt: "Princess tulle party dress for girls, layered tulle skirt with sparkles, professional product photography, luxury kids fashion e-commerce" },
  { path: `${PRODUCT_DIR}/kids-fashion-3.jpg`, prompt: "Mini denim jacket for kids, designer wash with leather patches, professional product photography, luxury kids fashion e-commerce" },
  
  // Home candles
  { path: `${PRODUCT_DIR}/home-candle-trio.jpg`, prompt: "Handpoured soy candle trio in artisan ceramic vessels, warm amber glow, professional product photography, luxury home fragrance e-commerce" },
  { path: `${PRODUCT_DIR}/home-diffuser-1.jpg`, prompt: "Luxury reed diffuser set in glass vessel with natural rattan sticks, premium home fragrance, professional product photography, luxury e-commerce" },
];

async function main() {
  const zai = await ZAI.create();
  
  for (let i = 0; i < IMAGES.length; i++) {
    const { path: outPath, prompt } = IMAGES[i];
    
    // Skip if already generated
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 50000) {
      console.log(`[${i+1}/${IMAGES.length}] SKIP (already exists): ${path.basename(outPath)}`);
      continue;
    }
    
    try {
      console.log(`[${i+1}/${IMAGES.length}] Generating: ${path.basename(outPath)}`);
      const response = await zai.images.generations.create({
        prompt,
        size: '1024x1024'
      });
      
      const imageBase64 = response.data[0].base64;
      const buffer = Buffer.from(imageBase64, 'base64');
      fs.writeFileSync(outPath, buffer);
      console.log(`  ✓ Saved (${(buffer.length / 1024).toFixed(0)} KB)`);
    } catch (error: any) {
      console.error(`  ✗ Failed: ${error.message}`);
    }
  }
  
  console.log('\nDone!');
}

main().catch(console.error);
