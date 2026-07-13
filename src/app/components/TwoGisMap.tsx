"use client";

import {load} from "@2gis/mapgl";
import type {CSSProperties} from "react";
import {useEffect, useMemo, useRef, useState} from "react";
import styles from "./TwoGisMap.module.css";

type MapPoint = {
    id: string;
    title: string;
    coordinates: [number, number];
    layer: RouteLayer;
    item: RankingItem;
};

type RouteLayer = {
    id: string;
    title: string;
    description: string;
    color: string;
};

type RankingItem = {
    rank: number;
    fallbackImage?: string;
    imageTitle: string;
    objectName: string;
    routeName: string;
    routeId: string;
    address: string;
    participantsCount: number;
    popularityIndex: number;
    trendDirection: "up" | "down" | "same";
    voteCount: number;
    votePercent: string;
    lastUpdate: string;
};

type RankingResponse = {
    updatedAt: string;
    periodLabel: string;
    items: RankingItem[];
};

type ActiveRouteId = "all" | RouteLayer["id"];

type WikiImagePage = {
    thumbnail?: {
        source?: string;
    };
    title?: string;
};

type WikiImageResponse = {
    query?: {
        pages?: Record<string, WikiImagePage>;
    };
};

type MapglApi = Awaited<ReturnType<typeof load>>;
type MapglMap = InstanceType<MapglApi["Map"]>;
type MapglMarker = InstanceType<MapglApi["Marker"]>;

const RYAZAN_CENTER: [number, number] = [39.7364, 54.6292];
const ALL_ROUTES_ID: ActiveRouteId = "all";
const WIKI_THUMBNAIL_SIZE = 960;
const LOCAL_FALLBACK_IMAGE = "data/images/preview.jpg";

const RYAZAN_OBJECT_COORDINATES: Record<string, [number, number]> = {
    "Рязанский кремль": [39.7519, 54.6362],
    "Дворец Олега": [39.7524, 54.6369],
    "Успенский собор": [39.7529, 54.6365],
    "Музей-заповедник С.А. Есенина": [39.5358, 54.8728],
    "Константиново": [39.5952, 54.8652],
    "Музей космонавтики": [39.8001, 54.7326],
    "Площадь Ленина": [39.7419, 54.6297],
    "Площадь Победы": [39.7139, 54.6308],
};

const RYAZAN_ROUTE_LAYERS: RouteLayer[] = [
    {
        id: "history",
        title: "Историческая Рязань",
        description: "Кремль, соборы и старый центр",
        color: "#2563eb",
    },
    {
        id: "literature",
        title: "Литературная Рязань",
        description: "Есенинские места и культурные точки",
        color: "#16a34a",
    },
    {
        id: "science",
        title: "Научная и космическая",
        description: "Музеи, технологии и открытия",
        color: "#c2410c",
    },
    {
        id: "city",
        title: "Городские площади",
        description: "Центральные общественные пространства",
        color: "#7c3aed",
    },
];

const RYAZAN_RANKING: RankingResponse = {
    updatedAt: "2025-05-27T12:45:30+03:00",
    periodLabel: "20.05.2025 - 27.05.2025",
    items: [
        {
            rank: 1,
            imageTitle: "Рязанский кремль",
            objectName: "Рязанский кремль",
            routeName: "Историческая Рязань",
            routeId: "history",
            address: "Рязань, Кремль",
            participantsCount: 12458,
            popularityIndex: 92,
            trendDirection: "up",
            voteCount: 5842,
            votePercent: "14,14%",
            lastUpdate: "сегодня в 12:45:30",
        },
        {
            rank: 2,
            imageTitle: "Государственный музей-заповедник С. А. Есенина",
            objectName: "Музей-заповедник С.А. Есенина",
            routeName: "Литературная Рязань",
            routeId: "literature",
            address: "Рязанская область, село Константиново",
            participantsCount: 9850,
            popularityIndex: 81,
            trendDirection: "same",
            voteCount: 4210,
            votePercent: "10,19%",
            lastUpdate: "сегодня в 12:45:30",
        },
        {
            rank: 3,
            imageTitle: "Константиново (Рыбновский район)",
            objectName: "Константиново",
            routeName: "Литературная Рязань",
            routeId: "literature",
            address: "Рязанская область, Рыбновский район",
            participantsCount: 7312,
            popularityIndex: 74,
            trendDirection: "up",
            voteCount: 3098,
            votePercent: "7,50%",
            lastUpdate: "сегодня в 12:45:30",
        },
        {
            rank: 4,
            imageTitle: "Рязанский кремль",
            objectName: "Дворец Олега",
            routeName: "Историческая Рязань",
            routeId: "history",
            address: "Рязань, Кремль",
            participantsCount: 6920,
            popularityIndex: 75,
            trendDirection: "down",
            voteCount: 2785,
            votePercent: "6,74%",
            lastUpdate: "сегодня в 12:44:10",
        },
        {
            rank: 5,
            imageTitle: "Успенский собор (Рязань)",
            objectName: "Успенский собор",
            routeName: "Историческая Рязань",
            routeId: "history",
            address: "Рязань, Кремль",
            participantsCount: 6450,
            popularityIndex: 71,
            trendDirection: "same",
            voteCount: 2410,
            votePercent: "5,83%",
            lastUpdate: "сегодня в 12:43:58",
        },
        {
            rank: 6,
            imageTitle: "Музей и дом-усадьба К. Э. Циолковского",
            objectName: "Музей космонавтики",
            routeName: "Научная и космическая",
            routeId: "science",
            address: "Рязанская область, Ижевское",
            participantsCount: 7420,
            popularityIndex: 79,
            trendDirection: "up",
            voteCount: 3102,
            votePercent: "7,51%",
            lastUpdate: "сегодня в 12:43:30",
        },
        {
            rank: 7,
            imageTitle: "Площадь Ленина (Рязань)",
            objectName: "Площадь Ленина",
            routeName: "Городские площади",
            routeId: "city",
            address: "Рязань, площадь Ленина",
            participantsCount: 5420,
            popularityIndex: 64,
            trendDirection: "same",
            voteCount: 1980,
            votePercent: "4,79%",
            lastUpdate: "сегодня в 12:42:24",
        },
        {
            rank: 8,
            fallbackImage: LOCAL_FALLBACK_IMAGE,
            imageTitle: "Монумент Победы (Рязань)",
            objectName: "Площадь Победы",
            routeName: "Городские площади",
            routeId: "city",
            address: "Рязань, площадь Победы",
            participantsCount: 4380,
            popularityIndex: 58,
            trendDirection: "down",
            voteCount: 1620,
            votePercent: "3,92%",
            lastUpdate: "сегодня в 12:41:10",
        },
    ],
};

function toMapPoints(response: RankingResponse): MapPoint[] {
    return response.items.flatMap((item) => {
        const coordinates = RYAZAN_OBJECT_COORDINATES[item.objectName];
        const layer = RYAZAN_ROUTE_LAYERS.find((routeLayer) => routeLayer.id === item.routeId);

        if (!coordinates || !layer) {
            return [];
        }

        return [{
            id: `${item.rank}-${item.objectName}`,
            title: item.objectName,
            coordinates,
            layer,
            item,
        }];
    });
}

const RYAZAN_POINTS = toMapPoints(RYAZAN_RANKING);

function formatNumber(value: number) {
    return new Intl.NumberFormat("ru-RU").format(value);
}

function getTrendLabel(direction: RankingItem["trendDirection"]) {
    return {
        up: "Растет",
        down: "Снижается",
        same: "Без изменений",
    }[direction];
}

function getTrendClass(direction: RankingItem["trendDirection"]) {
    return {
        up: styles.trendUp,
        down: styles.trendDown,
        same: styles.trendSame,
    }[direction];
}

function getMarkerSize(item: RankingItem): [number, number] {
    const size = Math.max(34, Math.min(54, 30 + item.popularityIndex * 0.24));

    return [size, size];
}

function createMarkerIcon(item: RankingItem, layer: RouteLayer) {
    const color = layer.color;
    const svg = `
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="28" r="19" fill="${color}" fill-opacity="0.22"/>
            <circle cx="32" cy="28" r="14" fill="${color}" stroke="white" stroke-width="3"/>
            <path d="M32 58L22 40H42L32 58Z" fill="${color}" stroke="white" stroke-width="3" stroke-linejoin="round"/>
            <text x="32" y="33" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="800" fill="white">${item.rank}</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(value, max));
}

function buildWikiImagesUrl(items: RankingItem[]) {
    const titles = [...new Set(items.map((item) => item.imageTitle))];
    const params = new URLSearchParams({
        action: "query",
        format: "json",
        origin: "*",
        piprop: "thumbnail",
        pithumbsize: String(WIKI_THUMBNAIL_SIZE),
        prop: "pageimages",
        titles: titles.join("|"),
    });

    return `https://ru.wikipedia.org/w/api.php?${params.toString()}`;
}

function getPlaceImage(item: RankingItem, imageByTitle: Record<string, string>) {
    return imageByTitle[item.imageTitle] ?? item.fallbackImage ?? LOCAL_FALLBACK_IMAGE;
}

type TwoGisMapProps = {
    fullscreen?: boolean;
};

export function TwoGisMap({fullscreen = false}: TwoGisMapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapApiRef = useRef<MapglApi | null>(null);
    const mapRef = useRef<MapglMap | null>(null);
    const markersRef = useRef<MapglMarker[]>([]);
    const mapKey = process.env.NEXT_PUBLIC_2GIS_MAPGL_KEY;
    const [activeRouteId, setActiveRouteId] = useState<ActiveRouteId>(ALL_ROUTES_ID);
    const [activePoint, setActivePoint] = useState<MapPoint | null>(null);
    const [imageByTitle, setImageByTitle] = useState<Record<string, string>>({});
    const [tooltipPosition, setTooltipPosition] = useState({x: 24, y: 24});
    const [status, setStatus] = useState<"loading" | "ready" | "missing-key" | "error">(
        mapKey ? "loading" : "missing-key",
    );
    const visiblePoints = useMemo(
        () => activeRouteId === ALL_ROUTES_ID
            ? RYAZAN_POINTS
            : RYAZAN_POINTS.filter((point) => point.layer.id === activeRouteId),
        [activeRouteId],
    );

    function selectRoute(routeId: ActiveRouteId) {
        setActiveRouteId(routeId);
        setActivePoint((point) => {
            if (!point || routeId === ALL_ROUTES_ID || point.layer.id === routeId) {
                return point;
            }

            return null;
        });
    }

    useEffect(() => {
        let isDisposed = false;

        if (!mapKey) {
            return;
        }

        async function initMap() {
            try {
                const mapglAPI = await load();

                if (isDisposed || !containerRef.current) {
                    return;
                }

                const nextMap = new mapglAPI.Map(containerRef.current, {
                    center: RYAZAN_CENTER,
                    key: mapKey,
                    zoom: 13,
                });
                mapApiRef.current = mapglAPI;
                mapRef.current = nextMap;

                setStatus("ready");
            } catch {
                if (!isDisposed) {
                    setStatus("error");
                }
            }
        }

        initMap();

        return () => {
            isDisposed = true;
            markersRef.current.forEach((marker) => marker.destroy());
            markersRef.current = [];
            mapRef.current?.destroy();
            mapRef.current = null;
            mapApiRef.current = null;
        };
    }, [mapKey]);

    useEffect(() => {
        const controller = new AbortController();

        async function loadWikiImages() {
            try {
                const response = await fetch(buildWikiImagesUrl(RYAZAN_RANKING.items), {
                    signal: controller.signal,
                });

                if (!response.ok) {
                    return;
                }

                const data = await response.json() as WikiImageResponse;
                const nextImages: Record<string, string> = {};

                Object.values(data.query?.pages ?? {}).forEach((page) => {
                    if (page.title && page.thumbnail?.source) {
                        nextImages[page.title] = page.thumbnail.source;
                    }
                });

                setImageByTitle(nextImages);
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }
            }
        }

        loadWikiImages();

        return () => {
            controller.abort();
        };
    }, []);

    useEffect(() => {
        if (status !== "ready" || !mapApiRef.current || !mapRef.current) {
            return;
        }

        markersRef.current.forEach((marker) => marker.destroy());
        markersRef.current = visiblePoints.map((point) => {
            const size = getMarkerSize(point.item);
            const marker = new mapApiRef.current!.Marker(mapRef.current!, {
                coordinates: point.coordinates,
                icon: createMarkerIcon(point.item, point.layer),
                size,
                anchor: [size[0] / 2, size[1] - 4],
                label: {
                    text: `#${point.item.rank} ${point.title}`,
                    fontSize: 12,
                    color: "#172033",
                    haloColor: "#ffffff",
                    haloRadius: 2,
                    offset: [0, 28],
                },
                userData: point,
            });

            marker.on("click", (event) => {
                const mapRect = containerRef.current?.getBoundingClientRect();
                const cardWidth = 380;
                const cardHeight = 560;
                const gap = 18;
                const mapWidth = mapRect?.width ?? window.innerWidth;
                const mapHeight = mapRect?.height ?? window.innerHeight;
                const pointX = event.point[0];
                const pointY = event.point[1];
                const left = pointX + cardWidth + gap > mapWidth
                    ? pointX - cardWidth - gap
                    : pointX + gap;

                setActivePoint(point);
                setTooltipPosition({
                    x: clamp(left, 12, Math.max(12, mapWidth - cardWidth - 12)),
                    y: clamp(pointY - 96, 12, Math.max(12, mapHeight - cardHeight - 12)),
                });
                mapRef.current?.setCenter(point.coordinates, {duration: 300});
            });

            return marker;
        });

        return () => {
            markersRef.current.forEach((marker) => marker.destroy());
            markersRef.current = [];
        };
    }, [status, visiblePoints]);

    return (
        <section
            className={[styles.mapPanel, fullscreen ? styles.fullscreen : ""].join(" ")}
            aria-label="2GIS map"
        >
            <div className={styles.mapViewport}>
                <div ref={containerRef} className={styles.mapContainer}/>
                <aside className={styles.layersPanel} aria-label="Слои маршрутов">
                    <div className={styles.layersHeader}>
                        <label htmlFor="route-layer-select">Маршрут</label>
                        <strong>{visiblePoints.length} точек</strong>
                    </div>
                    <select
                        className={styles.routeSelect}
                        id="route-layer-select"
                        value={activeRouteId}
                        onChange={(event) => selectRoute(event.target.value as ActiveRouteId)}
                    >
                        <option value={ALL_ROUTES_ID}>Все маршруты</option>
                        {RYAZAN_ROUTE_LAYERS.map((layer) => {
                            const pointsCount = RYAZAN_POINTS.filter((point) => point.layer.id === layer.id).length;

                            return (
                                <option key={layer.id} value={layer.id}>
                                    {layer.title} · {pointsCount}
                                </option>
                            );
                        })}
                    </select>
                    {activeRouteId !== ALL_ROUTES_ID ? (
                        <p className={styles.routeDescription}>
                            {RYAZAN_ROUTE_LAYERS.find((layer) => layer.id === activeRouteId)?.description}
                        </p>
                    ) : (
                        <p className={styles.routeDescription}>Показываем все группы точек на карте.</p>
                    )}
                </aside>
                {status === "ready" && activePoint ? (
                    <article
                        className={styles.tooltip}
                        style={{
                            "--tooltip-x": `${tooltipPosition.x}px`,
                            "--tooltip-y": `${tooltipPosition.y}px`,
                        } as CSSProperties}
                    >
                        <button
                            className={styles.tooltipClose}
                            type="button"
                            aria-label="Закрыть карточку точки"
                            onClick={() => setActivePoint(null)}
                        >
                            ×
                        </button>
                        <div className={styles.tooltipImage}>
                            <div
                                className={styles.imagePreview}
                                style={{backgroundImage: `url("${getPlaceImage(activePoint.item, imageByTitle)}")`}}
                            />
                            <div className={styles.imageFallback}>{activePoint.title}</div>
                            <span className={styles.rankBadge}>#{activePoint.item.rank}</span>
                        </div>

                        <div className={styles.tooltipHeader}>
                            <div>
                                <p>{activePoint.item.routeName}</p>
                                <h2>{activePoint.title}</h2>
                                <address>{activePoint.item.address}</address>
                            </div>
                            <span className={[styles.trendBadge, getTrendClass(activePoint.item.trendDirection)].join(" ")}>
                                {getTrendLabel(activePoint.item.trendDirection)}
                            </span>
                        </div>

                        <div className={styles.popularityBlock}>
                            <div className={styles.popularityHeader}>
                                <span>Индекс популярности</span>
                                <strong>{activePoint.item.popularityIndex}</strong>
                            </div>
                            <div className={styles.progressTrack}>
                                <div
                                    className={styles.progressValue}
                                    style={{width: `${activePoint.item.popularityIndex}%`}}
                                />
                            </div>
                        </div>

                        <dl className={styles.metricGrid}>
                            <div>
                                <dt>Участники</dt>
                                <dd>{formatNumber(activePoint.item.participantsCount)}</dd>
                            </div>
                            <div>
                                <dt>Голоса</dt>
                                <dd>{formatNumber(activePoint.item.voteCount)}</dd>
                            </div>
                            <div>
                                <dt>Доля голосов</dt>
                                <dd>{activePoint.item.votePercent}</dd>
                            </div>
                            <div>
                                <dt>Обновлено</dt>
                                <dd>{activePoint.item.lastUpdate}</dd>
                            </div>
                        </dl>

                        <footer className={styles.tooltipFooter}>
                            Период: {RYAZAN_RANKING.periodLabel}
                        </footer>
                    </article>
                ) : null}
                {status === "loading" ? (
                    <div className={styles.mapState}>Загружаем карту 2ГИС...</div>
                ) : null}
                {status === "missing-key" ? (
                    <div className={styles.mapState}>Добавьте `NEXT_PUBLIC_2GIS_MAPGL_KEY` в окружение, чтобы загрузить карту.</div>
                ) : null}
                {status === "error" ? (
                    <div className={styles.mapState}>Не удалось загрузить карту 2ГИС.</div>
                ) : null}
            </div>
        </section>
    );
}
