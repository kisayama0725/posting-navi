# PostingNavi - プロジェクトガイド

## 概要
ピザ屋のチラシ配布(ポスティング)管理スマホWebアプリ。管理者がスタッフにエリアを割り当て、スタッフはスマホで地図を見ながら配布する。

## 技術スタック
- Next.js 14 (App Router, TypeScript) + Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Google Maps JavaScript API (`@googlemaps/js-api-loader`)
- Google Routes API / Places API (サーバーサイド)
- Claude API (sonnet-4) - 枚数算出/駐輪場所選定/振り返り
- recharts (グラフ)

## 仕様書
元の仕様書: `C:\Users\Isayama\Downloads\PostingNavi_ClaudeCode_Prompt.md`
(MacBookでは仕様書の場所が異なる可能性あり。ユーザーに確認すること)

## 環境変数 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=   # フロントエンド用
GOOGLE_MAPS_API_KEY=               # サーバーサイド用 (Routes/Places API)
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=    # AdvancedMarkerElement用 (重要: NEXT_PUBLIC_が必須)
ANTHROPIC_API_KEY=
```
注意: Windows環境では `GOOGLE_MAPS_MAP_ID` (NEXT_PUBLIC_なし) で設定されている可能性あり。クライアントで使うには `NEXT_PUBLIC_` プレフィックスが必要。

## DB (Supabase)
- プロジェクトID: `mqqqtbdbjjipusenxkci`
- スキーマ定義: `supabase/schema.sql`
- Email confirmation は無効化済み

### テーブル一覧
profiles, areas, tasks, gps_tracks, delivery_photos, admin_commands, staff_sales_records, flyer_calculations, parking_spots, ai_feedbacks

### RLS注意点
- admin系ポリシーは全て `public.is_admin()` SECURITY DEFINER関数を使用
- 直接 `profiles` テーブルを参照するポリシーを書くと**無限再帰エラー (42P17)** が発生する
- 新しいテーブルのadminポリシーを追加する場合は必ず `public.is_admin()` を使うこと

### profilesテーブルのカラム
`id`, `name` (display_nameではない), `email`, `role`, `created_at`

## Google Maps実装の注意
- Loaderは `setOptions` + `importLibrary` パターンを使用 (`new Loader().load()` は型エラーになる)
- PlaceAutocompleteの `language` オプションは使用不可 (言語設定はLoaderレベルで行う)
- DeliveryMapは `dynamic import` でSSR無効化必須
- AdvancedMarkerElementには `mapId` が必須

```typescript
// 正しいパターン (src/lib/google-maps/loader.ts)
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
setOptions({ key: ..., v: "weekly", language: "ja", region: "JP" });
await importLibrary("maps");
await importLibrary("places");
await importLibrary("marker");
```

## GitHub
- リポ: `kisayama0725/posting-navi`
- ブランチ: `develop` (作業ブランチ), `main`

## 実装状況 (2026-03-07時点)
全ページ・APIルートの初期実装完了。ビルド成功済み。

### 実装済みファイル
- 認証: login, middleware, auth callback
- 管理者: dashboard, tasks, tasks/new, areas, sales, staff, staff/[id]/report, reports
- スタッフ: today's tasks, tasks/[id]/setup, tasks/[id] (配布実行), report
- API: flyers/calculate, parking/suggest, route/optimize, route/split, staff/sales, staff/[id]/performance, staff/[id]/feedback, team/performance
- コンポーネント: DeliveryMap, AdminMap, DeliveryCounter, ElapsedTimer, MetricCard, PerformanceTrendChart, AIFeedbackCard, PlaceAutocomplete
- ライブラリ: google-maps/loader, routes, places, ai/calculateFlyers, selectParking, generateFeedback

### 未完了・要確認事項
1. **DBスキーマ適用**: `supabase/schema.sql` をSupabase SQL Editorで実行する必要あり（旧テーブルが残っている可能性）
2. **動作確認**: 各画面の実動作テストが未実施
3. **細かいUI調整**: スマホ最適化の微調整
4. **Vercelデプロイ**: 未実施

## ESLint設定
- `@typescript-eslint/no-explicit-any`: off
- `@typescript-eslint/no-unused-vars`: warn (argsIgnorePattern: ^_)
- `react-hooks/exhaustive-deps`: warn
