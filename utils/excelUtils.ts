import { Platform } from 'react-native';

// Platform-specific imports
let ExcelUtils: any;

if (Platform.OS === 'web') {
  ExcelUtils = require('./excelUtils.web').ExcelUtils;
} else {
  ExcelUtils = require('./excelUtils.native').ExcelUtils;
}

export { ExcelUtils };
export type { ExcelExercise, ExcelBlock, ExcelProgram } from './excelUtils.web';