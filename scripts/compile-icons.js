/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

const glob = require('glob');
const svgr = require('@svgr/core').default;
const path = require('path');
const fs = require('fs');
const license = require('../.eslintrc.js').rules[
  'local/require-license-header'
][1].licenses[1];

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.resolve(rootDir, 'src');
const iconsDir = path.resolve(srcDir, 'components', 'icon', 'assets');

function pascalCase(x) {
  return x.replace(/^(.)|[^a-zA-Z]([a-zA-Z])/g, (match, char1, char2) =>
    (char1 || char2).toUpperCase()
  );
}

const iconFiles = glob.sync('**/*.svg', { cwd: iconsDir, realpath: true });

iconFiles.forEach(async filePath => {
  const svgSource = fs.readFileSync(filePath);

  try {
    const viewBoxPosition = svgSource.toString().indexOf('viewBox');
    if (viewBoxPosition === -1) {
      throw new Error(`${filePath} is missing a 'viewBox' attribute`);
    }

    const jsxSource = await svgr(
      svgSource,
      {
        plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
        svgoConfig: {
          plugins: [
            { cleanupIDs: false },
            { prefixIds: false },
            { removeViewBox: false },
          ],
        },
        svgProps: {
          xmlns: 'http://www.w3.org/2000/svg',
        },
        titleProp: true,
        template: (
          { template },
          opts,
          { imports, componentName, props, jsx }
        ) => template.ast`
${imports}
const ${componentName} = (${props}) => ${jsx}
export const icon = ${componentName};
        `,
      },
      {
        componentName: `OuiIcon${pascalCase(path.basename(filePath, '.svg'))}`,
      }
    );

    const outputFilePath = filePath.replace(/\.svg$/, '.js');
    fs.writeFileSync(outputFilePath, license + jsxSource);
  } catch (e) {
    console.error(`Error processing ${filePath}`);
    console.error(e);
    process.exit(1);
  }
});
