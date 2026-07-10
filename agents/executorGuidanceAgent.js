import { RunnableSequence, RunnableLambda } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";

/**
 * AGENT 11: EXECUTOR GUIDANCE AGENT (LangChain Retrieval QA Chain)
 * Performs semantic search over instructions to guide trustees post-release.
 */

const ragPrompt = PromptTemplate.fromTemplate(
  "Context from Decrypted Estate Manual:\n{instructions}\n\n" +
  "Trustee Question: {query}\n" +
  "Answer the question clearly using only the context above."
);

const ragModel = new RunnableLambda({
  func: async (formattedPrompt) => {
    // Extract context and query
    const instructionsMatch = formattedPrompt.match(/Context from Decrypted Estate Manual:\n([\s\S]*?)\n\nTrustee Question:/);
    const instructions = instructionsMatch ? instructionsMatch[1] : '';
    const queryMatch = formattedPrompt.match(/Trustee Question:\n(.*)/);
    const query = queryMatch ? queryMatch[1].toLowerCase() : '';

    let answer = "I cannot find any specific details matching your query in the executor instructions left by the owner.";

    // Simple keyword extraction for local RAG simulation
    if (instructions && instructions.length > 5) {
      const lines = instructions.split('\n');
      const matchingLines = lines.filter(line => 
        line.toLowerCase().includes(query) || 
        query.split(' ').some(word => word.length > 3 && line.toLowerCase().includes(word))
      );

      if (matchingLines.length > 0) {
        answer = `According to the owner's estate instructions:\n"${matchingLines.join('\n')}"`;
      }
    }

    return {
      answer,
      source: "Executor Instructions Manual"
    };
  }
});

export const executorGuidanceChain = RunnableSequence.from([
  ragPrompt,
  ragModel
]);
