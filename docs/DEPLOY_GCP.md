# GCP Compute Engine デプロイ手順

この手順は、Google Cloud Platform (GCP) の Compute Engine (GCE) 上に、Docker Compose を使用してアプリケーションをデプロイする方法を説明します。

## 1. GCE インスタンスの作成

1. GCPコンソールにアクセスし、**Compute Engine** > **VM インスタンス** に移動します。
2. **インスタンスを作成** をクリックします。
3. 以下の設定（例）でインスタンスを作成します:
   - **名前**: `gocrud-instance`
   - **リージョン**: `asia-northeast1` (東京)
   - **マシンタイプ**: `e2-medium` (または必要に応じたスペック)
   - **ブートディスク**:
     - OS: `Ubuntu`
     - バージョン: `Ubuntu 22.04 LTS`
     - ディスクサイズ: 20GB以上
   - **ファイアウォール**:
     - 「HTTPトラフィックを許可する」にチェック
     - 「HTTPSトラフィックを許可する」にチェック
4. **作成** をクリックします。

## 2. ファイアウォールルールの設定

アプリケーションが使用するポート (80, 8084, 8000 など) を許可する必要があります。
_注意: 本番環境では必要なポートのみを許可し、IP制限などを設けることを推奨します。_

1. **VPC ネットワーク** > **ファイアウォール** に移動します。
2. **ファイアウォール ルールを作成** をクリックします。
3. 設定例:
   - **名前**: `allow-app-ports`
   - **ターゲットタグ**: `http-server` (インスタンス作成時に付与されたタグ)
   - **ソースIPの範囲**: `0.0.0.0/0` (全許可の場合)
   - **プロトコルとポート**: `tcp:8084`, `tcp:8000`, `tcp:5174` (開発用サーバーの場合)
     - ※ 本番運用でNginx (ポート80) を使う場合、デフォルトのHTTP許可ルールで十分な場合があります。今回の `docker-compose.yml` ではフロントエンドをポート 5174:80 で公開しているため、外部からは 5174 でアクセスするか、80:80 にマッピングを変更することを推奨します。

## 3. インスタンスへの接続と環境構築

1. 作成したインスタンスの **SSH** ボタンをクリックしてコンソールを開きます。
2. Docker と Docker Compose をインストールします。

   ```bash
   # Docker Install
   sudo apt-get update
   sudo apt-get install -y ca-certificates curl gnupg
   sudo install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   sudo chmod a+r /etc/apt/keyrings/docker.gpg

   echo \
     "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
     $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
     sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   sudo apt-get update
   sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

   # ユーザーをdockerグループに追加 (ログアウト/ログインが必要)
   sudo usermod -aG docker $USER
   newgrp docker
   ```

## 4. アプリケーションのデプロイ

1. コードをインスタンスに配置します (Git経由推奨)。

   ```bash
   git clone <repository-url>
   cd goCrud
   ```

   ※ プライベートリポジトリの場合はSSH鍵の設定などが必要です。簡易的にはSCPでファイル転送する方法もあります。

2. バックエンドの接続先設定 (必要に応じて)
   `backend/main.go` や `docker-compose.yml` 内の接続設定を確認してください。Docker Compose内ではサービス名で名前解決されるため、基本はそのままで動作します。

3. アプリケーションの起動

   ```bash
   docker compose up -d --build
   ```

4. 動作確認
   ブラウザで `http://<External-IP>:5174` (または設定したポート) にアクセスして確認します。

## 5. 永続化について

`docker-compose.yml` で `surrealdb-data` ボリュームを定義しているため、コンテナを再起動してもデータは保持されます。
