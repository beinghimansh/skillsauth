import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchRepoMock = vi.fn();
const fetchSkillMock = vi.fn();
const fetchManifestMock = vi.fn();
const fetchCRLMock = vi.fn();
const installSkillMock = vi.fn();
const addSkillToLockfileMock = vi.fn();
const verifyWithCRLMock = vi.fn();
const confirmMock = vi.fn();
const spinnerStartMock = vi.fn();
const spinnerStopMock = vi.fn();

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  isCancel: vi.fn(() => false),
  confirm: confirmMock,
  spinner: vi.fn(() => ({
    start: spinnerStartMock,
    stop: spinnerStopMock,
  })),
}));

vi.mock("../lib/api.js", () => ({
  fetchRepo: fetchRepoMock,
  fetchSkill: fetchSkillMock,
  fetchManifest: fetchManifestMock,
  fetchCRL: fetchCRLMock,
  recordDownload: vi.fn(),
  APIError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("../lib/installer.js", () => ({
  installSkill: installSkillMock,
}));

vi.mock("../lib/lockfile.js", () => ({
  addSkillToLockfile: addSkillToLockfileMock,
}));

vi.mock("../lib/verify.js", () => ({
  verifyWithCRL: verifyWithCRLMock,
}));

describe("add command unsigned behavior", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchRepoMock.mockResolvedValue({
      skills: [
        {
          id: "skill-1",
          slug: "acme-skill",
          name: "acme-skill",
          description: "desc",
          version: "1.0.0",
          sha: "sha",
          repoOwner: "acme",
          repoName: "skills",
          triggerPhrase: "",
          category: "dev",
          stars: 0,
          scanStatus: "clean",
          scannedAt: null,
          bundleHash: null,
          files: [{ path: "SKILL.md", content: "# skill" }],
        },
      ],
    });
    fetchSkillMock.mockResolvedValue({
      id: "skill-1",
      slug: "acme-skill",
      name: "acme-skill",
      description: "desc",
      version: "1.0.0",
      sha: "sha",
      repoOwner: "acme",
      repoName: "skills",
      triggerPhrase: "",
      category: "dev",
      stars: 0,
      scanStatus: "clean",
      scannedAt: null,
      bundleHash: null,
      files: [{ path: "SKILL.md", content: "# skill" }],
    });
    fetchManifestMock.mockResolvedValue(null);
    fetchCRLMock.mockResolvedValue(null);
    installSkillMock.mockReturnValue([
      {
        agent: "cursor",
        path: ".agents/skills/acme-skill/SKILL.md",
        status: "installed",
      },
    ]);
  });

  it("installs unsigned skill without verification prompt path", async () => {
    const { addCommand } = await import("../commands/add.js");

    await expect(
      addCommand("acme/skills", undefined, {
        yes: true,
        json: false,
        agent: ["cursor"],
      })
    ).resolves.toBeUndefined();

    expect(fetchManifestMock).toHaveBeenCalledTimes(1);
    expect(verifyWithCRLMock).not.toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
    expect(installSkillMock).toHaveBeenCalledTimes(1);
    expect(addSkillToLockfileMock).toHaveBeenCalledTimes(1);
  });
});

