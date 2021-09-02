import fs from 'fs/promises';
import * as path from 'path';
import makeDir from 'make-dir';
import { generatorHandler } from '@prisma/generator-helper';
import { parseEnvValue } from '@prisma/sdk';

import { run } from './generator';

import type { GeneratorOptions } from '@prisma/generator-helper';
import type { WriteableFileSpecs } from './generator/types';

export const stringToBoolean = (input: string, defaultValue = false) => {
  if (input === 'true') {
    return true;
  }
  if (input === 'false') {
    return false;
  }

  return defaultValue;
};

export const generate = (options: GeneratorOptions) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const output = parseEnvValue(options.generator.output!);

  const {
    connectDtoPrefix = 'Connect',
    createDtoPrefix = 'Create',
    updateDtoPrefix = 'Update',
    dtoSuffix = 'Dto',
    entityPrefix = '',
    entitySuffix = '',
  } = options.generator.config;

  const exportRelationModifierClasses = stringToBoolean(
    options.generator.config.exportRelationModifierClasses,
    true,
  );

  const outputToNestJsResourceStructure = stringToBoolean(
    options.generator.config.outputToNestJsResourceStructure,
    // using `true` as default value would be a breaking change
    false,
  );

  const annotateAllDtoProperties = stringToBoolean(
    options.generator.config.annotateAllDtoProperties,
    // using `true` as default value would be a breaking change
    false,
  );

  const reExport = stringToBoolean(
    options.generator.config.reExport,
    // using `true` as default value would be a breaking change
    false,
  );

  const results = run({
    output,
    dmmf: options.dmmf,
    exportRelationModifierClasses,
    outputToNestJsResourceStructure,
    connectDtoPrefix,
    createDtoPrefix,
    updateDtoPrefix,
    dtoSuffix,
    entityPrefix,
    entitySuffix,
    annotateAllDtoProperties,
  });

  const indexCollections: Record<string, WriteableFileSpecs> = {};

  if (reExport) {
    results.forEach(({ fileName }) => {
      const dirName = path.dirname(fileName);

      const { [dirName]: fileSpec } = indexCollections;
      indexCollections[dirName] = {
        fileName: fileSpec?.fileName || path.join(dirName, 'index.ts'),
        content: [
          fileSpec?.content || '',
          `export * from './${path.basename(fileName, '.ts')}';`,
        ].join('\n'),
      };
    });
  }

  return Promise.all(
    results
      .concat(Object.values(indexCollections))
      .map(async ({ fileName, content }) => {
        await makeDir(path.dirname(fileName));
        return fs.writeFile(fileName, content);
      }),
  );
};

generatorHandler({
  onManifest: () => ({
    defaultOutput: '../src/generated/nestjs-dto',
    prettyName: 'NestJS DTO Generator',
  }),
  onGenerate: generate,
});
