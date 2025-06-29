# IoT Temperature Conversion API 開発フロー

## 1. 開発開始時の準備

### 1.1 プロジェクト理解
- `Claude.md` で既存ルールを確認
- `.claude/` ディレクトリの知見ファイルを読み込み
- `ARD/` ディレクトリの技術決定記録を確認

### 1.2 開発環境セットアップ
```bash
# 最新のmainブランチに同期
git checkout main
git pull origin main

# 開発用ブランチ作成
git checkout -b feature/機能名
```

## 2. 機能設計・計画

### 2.1 ARD（Architecture Record Document）作成
新機能や重要な変更の場合：
- `ARD/ARD-YYYYMMDD-brief-description.md` を作成
- 技術決定理由、制約、代替案を記録

### 2.2 技術調査
- 既存コードパターンを `.claude/common-patterns.md` で確認
- 避けるべきパターンを `.claude/project-improvements.md` で確認

## 3. 実装フェーズ

### 3.1 コード実装
```bash
# 適切なディレクトリに配置
# テストファイル: tests/test-{機能名}.ts
# 設定ファイル: config/
# ドキュメント: docs/
# スクリプト: scripts/
```

### 3.2 品質チェック
- NIST標準準拠の温度変換実装
- 精度要件（有効数字15桁）確認
- RFC 7807準拠のエラーハンドリング

### 3.3 セキュリティチェック
- TLS 1.3以上の暗号化
- API Key + JWT認証
- レート制限とIP制限
- OWASP API Top 10対応

## 4. テスト・検証

### 4.1 パフォーマンステスト
- 単一変換：1ms以下（95%パーセンタイル）
- バッチ変換：10ms以下（1,000データポイント）

### 4.2 テスト実行
```bash
# テストスイート実行
npm test

# カバレッジ確認（90%以上）
npm run test:coverage
```

## 5. コミット・プッシュ

### 5.1 コミット
```bash
# 適切な粒度でコミット
git add .
git commit -m "feat: implement Celsius to Fahrenheit conversion logic"
```

### 5.2 プッシュ
```bash
git push origin feature/機能名
```

## 6. プルリクエスト・マージ

### 6.1 プルリクエスト作成
- APIテスト結果を添付
- パフォーマンステスト結果を添付
- 必要に応じてARD参照

### 6.2 マージ後処理
```bash
# mainブランチに戻る
git checkout main
git pull origin main

# 作業ブランチを削除
git branch -d feature/機能名
```

## 7. ドキュメント更新

### 7.1 知見ファイル更新
新しい実装や重要な決定を行った際：
- `.claude/project-knowledge.md` に技術的知見を追加
- `.claude/project-improvements.md` に改善履歴を記録
- `.claude/common-patterns.md` に再利用パターンを追加

### 7.2 日付記録
- 更新時は必ず `YYYYMMDD` 形式で日付を追記
- 変更履歴の追跡可能性を確保

## 8. 継続的改善

### 8.1 ルール追加プロセス
ユーザーから常時対応が必要な指示を受けた場合：
1. 「これを標準のルールにしますか？」と質問
2. YES回答時、`Claude.md` に追加ルールとして記載
3. 以降は標準ルールとして適用

### 8.2 品質向上
- 定期的なパフォーマンス監視
- セキュリティ脆弱性チェック
- API仕様書の最新化

## 注意事項

### 禁止事項
- ルートディレクトリへの一時ファイル配置
- 精度要件を満たさない変換ロジック
- セキュリティ要件を満たさない実装

### 必須事項
- 新エンドポイント追加時のOpenAPI仕様書更新
- パフォーマンス要件の遵守
- 適切なエラーハンドリング実装