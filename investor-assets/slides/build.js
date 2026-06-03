const pptxgen = require('pptxgenjs');
const path = require('path');
const html2pptx = require('/tmp/my-project/skills/ppt/scripts/html2pptx.js');

const SLIDES_DIR = '/home/z/my-project/investor-assets/slides';
const OUTPUT = '/home/z/my-project/investor-assets/3boxes-luxury-pitch-deck.pptx';

const slideFiles = [
  'slide01-cover.html',
  'slide02-problem.html',
  'slide03-market.html',
  'slide04-solution.html',
  'slide05-product.html',
  'slide06-howitworks.html',
  'slide07-categories.html',
  'slide08-businessmodel.html',
  'slide09-traction.html',
  'slide10-competitive.html',
  'slide11-theask.html',
  'slide12-contact.html',
];

async function main() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  
  const fontConfig = { cjk: 'Microsoft YaHei', latin: 'Palatino Linotype' };
  
  const allWarnings = [];
  
  for (const file of slideFiles) {
    const htmlPath = path.join(SLIDES_DIR, file);
    console.log(`Processing: ${file}`);
    try {
      const { slide, placeholders, warnings } = await html2pptx(htmlPath, pptx, { fontConfig });
      if (warnings.length > 0) {
        console.log(`  Warnings: ${warnings.join('; ')}`);
        allWarnings.push({ file, warnings });
      } else {
        console.log(`  OK`);
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      allWarnings.push({ file, warnings: [err.message] });
    }
  }
  
  console.log('\n--- Summary ---');
  console.log(`Total slides: ${slideFiles.length}`);
  console.log(`Slides with warnings: ${allWarnings.length}`);
  
  if (allWarnings.length > 0) {
    for (const w of allWarnings) {
      console.log(`  ${w.file}: ${w.warnings.join('; ')}`);
    }
  }
  
  await pptx.writeFile({ fileName: OUTPUT });
  console.log(`\nSaved: ${OUTPUT}`);
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
