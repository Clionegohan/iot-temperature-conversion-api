# IoT Temperature Conversion API - Context

## プロジェクト基本情報

### プロジェクト名
**TempConvert API** - IoT Temperature Conversion API

### プロジェクト目的
IoT業界における温度データの単位変換問題を解決し、異なるセンサー・システム間のデータ互換性を提供する専門特化APIサービス。

**核心価値**: スマートホーム・農業IoTデバイス間の温度データ標準化

### ビジネス目標
- **第1段階（3ヶ月）**: API登録企業100社、月間リクエスト100,000回
- **第2段階（6ヶ月）**: 月間収益$2,000
- **最終目標（12ヶ月）**: 月間収益$8,000、IoT開発企業800社

### ターゲット市場
- **Primary**: スマートホーム開発企業（個人〜中小企業）
- **Secondary**: 農業IoT企業（温室管理、土壌温度監視）
- **除外**: 医療機器、科学研究用途（リスク回避）

## 技術スタック選定理由

### 核心技術
```
Node.js + Fastify + TypeScript + Convex
```

**選定理由**:
- **Node.js**: エコシステムの豊富さ、個人開発での習熟度
- **Fastify**: Express.jsより高速、モダンなアーキテクチャ、型安全性
- **TypeScript**: 型安全性、大規模化への対応、メンテナンス性
- **Convex**: リアルタイムデータベース、認証機能内蔵、スケーリング自動化

### データベース戦略
- **Convex Database**: リアルタイム同期、型安全なqueries
- **認証**: Convex Auth（API Key + JWT）
- **使用量tracking**: Convex functionsでリアルタイム監視

### 開発・運用ツール
- **テスト**: Jest（単体テスト中心、カバレッジ80%目標）
- **デプロイ**: Convex deployment platform
- **監視**: Convex Dashboard + 必要に応じてSentry追加
- **コードレビュー**: CodeRabbit（自動レビュー）

## ビジネス制約・要件

### パフォーマンス要件（MVP版）
- **レスポンス時間**: 10ms以下（単一変換）
- **スループット**: 100 RPS（初期目標）
- **同時接続**: 50接続

### 精度要件（個人開発レベル）
- **一般用途精度**: 小数点以下3桁
- **対応単位**: Celsius, Fahrenheit, Kelvin, Rankine
- **変換公式**: 標準的な数学公式（NIST準拠は将来対応）

### セキュリティ要件
- **API認証**: API Key方式（シンプルスタート）
- **レート制限**: IP別、API Key別制限
- **データ保護**: 個人情報非保存（変換データのみ）

### 品質要件
- **テストカバレッジ**: 80%以上
- **コミット粒度**: 1機能1コミット
- **プルリクエスト**: 小さく頻繁に（CodeRabbit review）

## 技術的制約条件

### 開発制約
- **個人開発**: リソース限定、シンプル設計優先
- **Claude Code**: AI駆動開発、Git管理徹底
- **予算制約**: 無料〜低コストサービス優先

### 機能制約
- **医療・科学用途除外**: 責任リスク回避
- **高精度計算除外**: 複雑な精度要件回避
- **大規模同時接続**: 初期は50接続上限

### 技術債務管理
- **過剰設計回避**: YAGNI原則厳守
- **MVP最優先**: 完璧より完成
- **段階的改善**: 小さく始めて需要確認後に拡張

## 成功指標（KPI）

### 技術指標
- **API稼働率**: 99%以上
- **レスポンス時間**: 平均5ms以下
- **エラー率**: 1%以下

### ビジネス指標
- **月間API呼び出し数**: 段階的増加
- **顧客獲得数**: 月10社ペース
- **顧客満足度**: フィードバック収集

### 品質指標
- **バグ発生率**: 週1件以下
- **テストカバレッジ**: 80%維持
- **プルリクエストサイクル**: 24時間以内

## プロジェクト哲学

### 開発原則
1. **小さく始める**: MVP → 段階的拡張
2. **品質重視**: 有料サービスとしての信頼性
3. **AI活用**: Claude Codeによる効率的開発
4. **継続改善**: フィードバック駆動の機能追加

### 意思決定基準
- **シンプル > 完璧**: 複雑さを避ける
- **実証 > 推測**: 小さくテストして確認
- **顧客価値 > 技術的興味**: 需要ファースト
- **保守性 > パフォーマンス**: 長期的な運用重視

---
**作成日**: 2025-06-29  
**更新予定**: プロジェクト開始時、重要な方針変更時
