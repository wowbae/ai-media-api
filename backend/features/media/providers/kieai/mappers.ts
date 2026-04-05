export interface KieAiModelMappers {
    mapKlingAspectRatio: (aspectRatio?: string) => "1:1" | "16:9" | "9:16";
    mapKlingDuration: (duration?: number) => "5" | "10";
    mapSeedreamAspectRatio: (
        aspectRatio?: string,
    ) =>
        | "1:1"
        | "4:3"
        | "3:4"
        | "4:5"
        | "16:9"
        | "9:16"
        | "2:3"
        | "3:2"
        | "21:9";
    mapSeedreamQuality: (quality?: string) => "basic" | "high";
}

export const kieAiMappers: KieAiModelMappers = {
    mapKlingAspectRatio(aspectRatio?: string): "1:1" | "16:9" | "9:16" {
        if (aspectRatio === "9:16") return "9:16";
        if (aspectRatio === "16:9") return "16:9";
        return "1:1";
    },

    mapKlingDuration(duration?: number): "5" | "10" {
        return duration === 10 ? "10" : "5";
    },

    mapSeedreamAspectRatio(
        aspectRatio?: string,
    ):
        | "1:1"
        | "4:3"
        | "3:4"
        | "4:5"
        | "16:9"
        | "9:16"
        | "2:3"
        | "3:2"
        | "21:9" {
        const valid = [
            "1:1",
            "4:3",
            "3:4",
            "4:5",
            "16:9",
            "9:16",
            "2:3",
            "3:2",
            "21:9",
        ];
        if (aspectRatio && valid.includes(aspectRatio)) {
            return aspectRatio as
                | "1:1"
                | "4:3"
                | "3:4"
                | "4:5"
                | "16:9"
                | "9:16"
                | "2:3"
                | "3:2"
                | "21:9";
        }
        return "1:1";
    },

    mapSeedreamQuality(quality?: string): "basic" | "high" {
        if (
            quality === "4k" ||
            quality === "high" ||
            quality === "HIGH" ||
            quality === "ULTRA"
        ) {
            return "high";
        }
        return "basic";
    },
};
