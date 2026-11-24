pipeline {
  agent any

  triggers {
    pollSCM('H/5 * * * *')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build CI test image') {
      steps {
        sh 'docker build --target test -f docker/webapp/Dockerfile -t postiliste:test-${BUILD_NUMBER} .'
      }
    }

    stage('Unit and integration tests') {
      steps {
        sh 'docker run --rm postiliste:test-${BUILD_NUMBER}'
      }
    }

    stage('Build production image') {
      steps {
        sh 'docker build --target production -f docker/webapp/Dockerfile -t postiliste:${BUILD_NUMBER} .'
      }
    }

    stage('Deploy local production') {
      steps {
        withCredentials([
          string(credentialsId: 'postiliste-postgres-password', variable: 'POSTGRES_PASSWORD'),
          string(credentialsId: 'postiliste-admin-password', variable: 'ADMIN_PASSWORD'),
          string(credentialsId: 'postiliste-session-secret', variable: 'SESSION_SECRET')
        ]) {
          withEnv([
            'ADMIN_USERNAME=admin',
            'ADMIN_EMAIL=admin@example.test',
            'COOKIE_SECURE=false'
          ]) {
            sh 'docker compose config --quiet'
            sh 'docker compose up -d --build --remove-orphans'
            sh 'docker compose exec -T postiliste node -e "fetch(\'http://127.0.0.1:3000/health\').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"'
            sh 'docker compose ps'
          }
        }
      }
    }
  }
}
