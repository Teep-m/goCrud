# ローカル環境構築手順

## 前提条件

- Docker Desktop がインストールされていること
- Git がインストールされていること

## 手順

1. リポジトリのクローン

   ```bash
   git clone <repository-url>
   cd goCrud
   ```

2. コンテナのビルドと起動

   ```bash
   docker-compose up --build
   ```

   初回はビルドに数分かかります。

3. 動作確認
   - フロントエンド: http://localhost:5173
   - バックエンド: http://localhost:8080 (API直接確認用)
   - SurrealDB: http://localhost:8000 (必要に応じて)

4. フロントエンドからの確認
   ブラウザで http://localhost:5173 にアクセスし、メッセージを入力して「Send」ボタンを押すと、リストに追加されることを確認してください。

## トラブルシューティング

- **DB接続エラー**: SurrealDBの起動が遅れている場合があります。コンテナのログを確認し、リトライするか再起動してください。
- **CORSエラー**: バックエンドのCORS設定を確認してください。
