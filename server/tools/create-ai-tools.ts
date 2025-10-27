import { CoreTool } from 'ai';

/**
 * Wraps our tool objects to be compatible with AI SDK
 * This bypasses the AI SDK's internal schema processing
 */
export function wrapToolForAI(toolObj: any): CoreTool {
  return {
    type: 'function',
    function: {
      name: toolObj.name || 'tool',
      description: toolObj.description,
      parameters: toolObj.parameters,
      execute: toolObj.execute
    }
  } as CoreTool;
}

/**
 * Create tools compatible with the AI SDK from plain tool objects
 */
export function createAITools(tools: Record<string, any>): Record<string, CoreTool> {
  const aiTools: Record<string, CoreTool> = {};

  for (const [name, tool] of Object.entries(tools)) {
    aiTools[name] = wrapToolForAI({ ...tool, name });
  }

  return aiTools;
}