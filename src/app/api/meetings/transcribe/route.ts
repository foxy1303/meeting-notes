import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";

export const runtime = "nodejs";
export const maxDuration = 300;

type ActionItem = {
  task: string;
  owner?: string;
  deadline?: string;
};

type MeetingSummary = {
  summary: string;
  sections: SummarySection[];
  keyPoints: string[];
  decisions: string[];
  actionItems: ActionItem[];
  questions: string[];
  risks: string[];
};

type SummarySection = {
  title: string;
  items: string[];
};

type ChatModelConfig = {
  baseUrl: string;
  apiKey?: string;
  model: string;
  source: string;
};

const execFileAsync = promisify(execFile);

const MAX_FILE_SIZE = Number(process.env.MAX_UPLOAD_MB || 200) * 1024 * 1024;
const WHISPER_BIN = process.env.WHISPER_CPP_BIN || "whisper-cli";
const WHISPER_MODEL = process.env.WHISPER_CPP_MODEL || "models/ggml-base.bin";
const FFMPEG_BIN = process.env.FFMPEG_BIN || "ffmpeg";
const SUMMARY_CHUNK_CHARS = Number(process.env.SUMMARY_CHUNK_CHARS || 12000);

export async function POST(request: Request) {
  let workDir = "";

  try {
    const body = await request.formData();
    const upload = body.get("file");
    const language = body.get("language");

    if (!(upload instanceof File)) {
      return Response.json(
        { error: "Файл записи не найден в запросе." },
        { status: 400 },
      );
    }

    if (upload.size > MAX_FILE_SIZE) {
      return Response.json(
        {
          error: `Файл слишком большой. Максимальный размер: ${Math.round(
            MAX_FILE_SIZE / 1024 / 1024,
          )} МБ.`,
        },
        { status: 413 },
      );
    }

    workDir = await mkdtemp(join(tmpdir(), "meeting-transcription-"));
    const originalPath = await saveUpload(upload, workDir);
    const wavPath = await prepareAudio(originalPath, workDir);
    const transcript = await transcribeAudio(wavPath, workDir, language);
    const summary = await summarizeMeeting(transcript);

    return Response.json({
      fileName: upload.name,
      transcript,
      ...summary,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось обработать запись.",
      },
      { status: 500 },
    );
  } finally {
    if (workDir) {
      await rm(workDir, { force: true, recursive: true });
    }
  }
}

async function saveUpload(file: File, workDir: string) {
  const safeName = sanitizeFileName(file.name);
  const filePath = join(workDir, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);
  return filePath;
}

async function prepareAudio(inputPath: string, workDir: string) {
  if (extname(inputPath).toLowerCase() === ".wav") {
    return inputPath;
  }

  const outputPath = join(workDir, "audio.wav");

  try {
    await execFileAsync(
      FFMPEG_BIN,
      [
        "-y",
        "-i",
        inputPath,
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        outputPath,
      ],
      { maxBuffer: 1024 * 1024 * 8 },
    );
  } catch (error) {
    throw new Error(
      `Не удалось подготовить аудио. Установите ffmpeg или укажите FFMPEG_BIN. Детали: ${readCommandError(
        error,
      )}`,
    );
  }

  return outputPath;
}

async function transcribeAudio(
  wavPath: string,
  workDir: string,
  language: FormDataEntryValue | null,
) {
  const outputBase = join(workDir, "transcript");
  const args = ["-m", WHISPER_MODEL, "-f", wavPath, "-otxt", "-of", outputBase];

  if (typeof language === "string" && language) {
    args.push("-l", language);
  }

  try {
    await execFileAsync(WHISPER_BIN, args, { maxBuffer: 1024 * 1024 * 64 });
  } catch (error) {
    throw new Error(
      `Не удалось выполнить whisper.cpp. Проверьте WHISPER_CPP_BIN и WHISPER_CPP_MODEL. Детали: ${readCommandError(
        error,
      )}`,
    );
  }

  const transcript = (
    await readFile(/* turbopackIgnore: true */ `${outputBase}.txt`, "utf8")
  ).trim();

  if (!transcript) {
    throw new Error("Whisper вернул пустую транскрипцию.");
  }

  return transcript;
}

async function summarizeMeeting(transcript: string) {
  const config = await readChatModelConfig();
  const chunks = splitTranscript(transcript, SUMMARY_CHUNK_CHARS);

  if (chunks.length === 1) {
    return summarizeWithOpenCode(buildSummaryPrompt(transcript), config);
  }

  const chunkSummaries: MeetingSummary[] = [];

  for (let index = 0; index < chunks.length; index += 1) {
    chunkSummaries.push(
      await summarizeWithOpenCode(
        buildChunkSummaryPrompt(chunks[index], index + 1, chunks.length),
        config,
      ),
    );
  }

  return summarizeWithOpenCode(
    buildFinalSummaryPrompt(chunkSummaries),
    config,
  );
}

async function readChatModelConfig(): Promise<ChatModelConfig> {
  const envConfig = readEnvChatModelConfig();

  if (envConfig) {
    return envConfig;
  }

  return readOpenCodeConfig();
}

function readEnvChatModelConfig(): ChatModelConfig | null {
  const baseUrl = readString(
    process.env.AI_BASE_URL ||
      process.env.CHAT_COMPLETIONS_BASE_URL ||
      process.env.OPENAI_BASE_URL,
  );
  const model = readString(
    process.env.AI_MODEL ||
      process.env.CHAT_COMPLETIONS_MODEL ||
      process.env.OPENAI_MODEL,
  );

  if (!baseUrl && !model) {
    return null;
  }

  if (!baseUrl || !model) {
    throw new Error(
      "Для конфигурации нейронки через env укажите AI_BASE_URL и AI_MODEL.",
    );
  }

  return {
    baseUrl,
    apiKey: readString(
      process.env.AI_API_KEY ||
        process.env.CHAT_COMPLETIONS_API_KEY ||
        process.env.OPENAI_API_KEY,
    ),
    model,
    source: "нейронка",
  };
}

async function readOpenCodeConfig(): Promise<ChatModelConfig> {
  const configPath =
    process.env.OPENCODE_CONFIG_PATH ||
    join(
      /* turbopackIgnore: true */ homedir(),
      ".config",
      "opencode",
      "opencode.json",
    );
  const providerName = process.env.OPENCODE_PROVIDER || "llm-bridge";
  const requestedModel = process.env.OPENCODE_MODEL || "smart-fast";
  const rawConfig = JSON.parse(
    await readFile(/* turbopackIgnore: true */ configPath, "utf8"),
  );

  if (!isRecord(rawConfig) || !isRecord(rawConfig.provider)) {
    throw new Error(`openCode config не содержит provider: ${configPath}`);
  }

  const provider = rawConfig.provider[providerName];

  if (!isRecord(provider)) {
    throw new Error(`openCode provider не найден: ${providerName}`);
  }

  const options = isRecord(provider.options) ? provider.options : provider;
  const baseUrl = readString(options.baseURL || options.baseUrl);
  const apiKey = readString(options.apiKey);
  const model = readOpenCodeModel(provider, requestedModel);

  if (!baseUrl || !apiKey || !model) {
    throw new Error(
      `openCode provider ${providerName} должен содержать baseURL, apiKey и модель ${requestedModel}.`,
    );
  }

  return { baseUrl, apiKey, model, source: "openCode" };
}

function readOpenCodeModel(provider: Record<string, unknown>, requestedModel: string) {
  if (!isRecord(provider.models)) {
    return requestedModel;
  }

  const modelConfig = provider.models[requestedModel];

  if (!isRecord(modelConfig)) {
    return requestedModel;
  }

  return readString(modelConfig.id) || readString(modelConfig.name) || requestedModel;
}

async function summarizeWithOpenCode(
  prompt: string,
  config: ChatModelConfig,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content:
            "Ты помощник, который готовит протоколы совещаний. Возвращай только валидный JSON без Markdown.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  const payload = await readUpstreamJson(response, `${config.source} chat/completions`);

  if (!response.ok) {
    throw new Error(readChatModelError(payload, config.source));
  }

  const text = extractChatCompletionText(payload);
  return normalizeSummary(JSON.parse(stripCodeFence(text)));
}

function splitTranscript(transcript: string, maxChunkChars: number) {
  if (transcript.length <= maxChunkChars) {
    return [transcript];
  }

  const paragraphs = transcript.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (next.length <= maxChunkChars) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    if (paragraph.length <= maxChunkChars) {
      current = paragraph;
      continue;
    }

    const sentences = paragraph.split(/(?<=[.!?。！？])\s+/);
    current = "";

    for (const sentence of sentences) {
      const nextSentence = current ? `${current} ${sentence}` : sentence;

      if (nextSentence.length <= maxChunkChars) {
        current = nextSentence;
      } else {
        if (current) {
          chunks.push(current);
        }

        current = sentence.slice(0, maxChunkChars);
      }
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

async function readUpstreamJson(response: Response, source: string) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    const contentType = response.headers.get("content-type") || "unknown";
    const snippet = text.replace(/\s+/g, " ").slice(0, 220);

    throw new Error(
      `${source} вернул не JSON. HTTP ${response.status}, content-type: ${contentType}. Фрагмент: ${snippet}`,
    );
  }
}

function buildSummaryPrompt(transcript: string) {
  return `Ты редактор протоколов совещаний. Твоя задача — сделать полную рабочую сводку, похожую на структурированные meeting notes для команды продукта/разработки.

Требования:
- Пиши на русском языке.
- Не делай короткий пересказ. Нужна полная сводка со всеми значимыми договоренностями, уточнениями, изменениями, спорными местами и следующими шагами.
- Группируй пункты по смысловым разделам с короткими заголовками, например: "KPI", "Метрики", "Пользовательская аналитика", "Воронка", "Доступ", "Результаты", "Административная панель", "Требуют уточнения".
- Если в записи есть другие темы, создай подходящие названия разделов сам.
- Каждый пункт должен быть отдельной мыслью в формате короткого bullet point.
- Отмечай замены и переименования явно: "X → заменить на Y", "❌ старое / ✅ новое", если это было в разговоре.
- Отдельно выделяй вопросы, которые требуют уточнения.
- Отдельно выделяй задачи, если есть исполнитель или следующий шаг.
- Не придумывай факты, которых нет в транскрипции.

Верни только JSON строго в такой структуре:
{
  "summary": "6-10 предложений с общим итогом встречи и контекстом",
  "sections": [
    {
      "title": "Название раздела",
      "items": ["детальный пункт", "детальный пункт"]
    }
  ],
  "keyPoints": ["самые важные пункты встречи"],
  "decisions": ["принятое решение или согласованное изменение"],
  "actionItems": [{"task": "задача", "owner": "ответственный или пусто", "deadline": "срок или пусто"}],
  "questions": ["вопрос, который требует уточнения"],
  "risks": ["риск, блокер или неоднозначность"]
}

Если данных для поля нет, верни пустой массив. В sections должно быть столько разделов, сколько реально нужно для полной сводки.

Транскрипция:
${transcript}`;
}

function buildChunkSummaryPrompt(
  transcriptChunk: string,
  chunkNumber: number,
  totalChunks: number,
) {
  return `Это часть ${chunkNumber} из ${totalChunks} длинной транскрипции совещания.

Сделай подробную промежуточную структурированную сводку только по этой части.

Важно:
- Не пытайся делать финальный общий вывод по всей встрече.
- Сохрани все решения, спорные места, замены, уточнения, задачи и открытые вопросы из этой части.
- Не придумывай контекст из других частей.
- Верни только JSON в той же структуре:
{
  "summary": "подробный итог этой части",
  "sections": [{"title": "Название раздела", "items": ["детальный пункт"]}],
  "keyPoints": ["важный пункт"],
  "decisions": ["решение"],
  "actionItems": [{"task": "задача", "owner": "ответственный или пусто", "deadline": "срок или пусто"}],
  "questions": ["вопрос"],
  "risks": ["риск"]
}

Часть транскрипции:
${transcriptChunk}`;
}

function buildFinalSummaryPrompt(chunkSummaries: MeetingSummary[]) {
  return `Ниже промежуточные JSON-сводки частей одного совещания.

Собери из них единую полную рабочую сводку встречи.

Требования:
- Убери дубли между частями.
- Сгруппируй пункты по смысловым разделам.
- Сохрани все конкретные решения, переименования, замены, задачи, вопросы и риски.
- Пиши как протокол для команды продукта/разработки.
- Не придумывай факты, которых нет в промежуточных сводках.
- Верни только JSON строго в структуре:
{
  "summary": "6-10 предложений с общим итогом встречи и контекстом",
  "sections": [{"title": "Название раздела", "items": ["детальный пункт"]}],
  "keyPoints": ["самые важные пункты встречи"],
  "decisions": ["принятое решение или согласованное изменение"],
  "actionItems": [{"task": "задача", "owner": "ответственный или пусто", "deadline": "срок или пусто"}],
  "questions": ["вопрос, который требует уточнения"],
  "risks": ["риск, блокер или неоднозначность"]
}

Промежуточные сводки:
${JSON.stringify(chunkSummaries, null, 2)}`;
}

function normalizeSummary(summary: unknown): MeetingSummary {
  if (!isRecord(summary)) {
    throw new Error("Сводка пришла в неожиданном формате.");
  }

  return {
    summary: readString(summary.summary),
    sections: readSummarySections(summary.sections),
    keyPoints: readStringArray(summary.keyPoints),
    decisions: readStringArray(summary.decisions),
    actionItems: readActionItems(summary.actionItems),
    questions: readStringArray(summary.questions),
    risks: readStringArray(summary.risks),
  };
}

function readSummarySections(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((section): SummarySection[] => {
    if (!isRecord(section) || typeof section.title !== "string") {
      return [];
    }

    return [
      {
        title: section.title,
        items: readStringArray(section.items),
      },
    ];
  });
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readActionItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): ActionItem[] => {
    if (!isRecord(item) || typeof item.task !== "string") {
      return [];
    }

    return [
      {
        task: item.task,
        owner: readString(item.owner),
        deadline: readString(item.deadline),
      },
    ];
  });
}

function sanitizeFileName(fileName: string) {
  const parsedName = basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
  return parsedName || "upload";
}

function stripCodeFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
}

function readChatModelError(payload: unknown, source: string) {
  if (
    isRecord(payload) &&
    isRecord(payload.error) &&
    typeof payload.error.message === "string"
  ) {
    return `${source} model error: ${payload.error.message}`;
  }

  return `${source} model не вернула сводку.`;
}

function extractChatCompletionText(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    throw new Error("Chat model вернула ответ в неожиданном формате.");
  }

  const firstChoice = payload.choices[0];

  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    throw new Error("Chat model не вернула message.");
  }

  const { content } = firstChoice.message;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
      .filter(Boolean)
      .join("\n");

    if (text) {
      return text;
    }
  }

  throw new Error("Chat model не вернула текст сводки.");
}

function readCommandError(error: unknown) {
  if (!isRecord(error)) {
    return "неизвестная ошибка";
  }

  const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
  const message = typeof error.message === "string" ? error.message : "";

  return stderr || message || "неизвестная ошибка";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
