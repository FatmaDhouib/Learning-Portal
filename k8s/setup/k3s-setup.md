# Guide d'Installation K3s et Stockage Persistant (Longhorn)

Ce document vous guide pas à pas pour configurer un cluster Kubernetes léger (K3s) sur 3 nœuds (VMs), ainsi que le système de stockage persistant distribué Longhorn.

## Prérequis
- 3 Machines Virtuelles (ex: Ubuntu 22.04 / Debian 12).
- Les machines doivent pouvoir communiquer entre elles sur le réseau local.
- Utilisateur avec privilèges `sudo` ou `root` sur toutes les machines.

## Étape 1 : Installation du Cluster K3s

### 1.1 - Installation du nœud Server (Master)
Le nœud Master exécutera l'API Kubernetes et intégrera une base de données `etcd` embarquée.

Connectez-vous à votre première machine (le Master) et exécutez la commande suivante :
```bash
curl -sfL https://get.k3s.io | sh -s - server --cluster-init
```

Une fois l'installation terminée, récupérez le token qui permettra aux workers de rejoindre le cluster :
```bash
sudo cat /var/lib/rancher/k3s/server/node-token
```
*(Notez ce token précieusement)*

Récupérez également l'adresse IP du master (ex: `192.168.1.100`).

### 1.2 - Installation des nœuds Agent (Workers)
Connectez-vous à chacune de vos deux autres machines (les Workers) et exécutez cette commande, en remplaçant `<MASTER_IP>` et `<TOKEN>` par les valeurs obtenues précédemment :

```bash
curl -sfL https://get.k3s.io | K3S_URL=https://<MASTER_IP>:6443 K3S_TOKEN=<TOKEN> sh -
```

### 1.3 - Vérification
Retournez sur le nœud Master et vérifiez que les 3 nœuds sont prêts :
```bash
sudo k3s kubectl get nodes
```

---

## Étape 2 : Configuration des Labels et Taints

Puisque la plateforme LearnHub contient des bases de données lourdes, il est recommandé de dédier un de vos nœuds Worker à l'hébergement exclusif des bases de données (PostgreSQL, MongoDB, MinIO).

Supposons que vos nœuds s'appellent `master-node`, `worker-1` et `worker-2`. Nous allons dédier `worker-2` aux bases de données.

Depuis le nœud Master :

**1. Ajouter un label au nœud dédié :**
```bash
sudo k3s kubectl label nodes worker-2 node-role.kubernetes.io/database=true
```

**2. Ajouter un taint pour éviter que d'autres pods ne s'y installent :**
```bash
sudo k3s kubectl taint nodes worker-2 database=heavy:NoSchedule
```
*(Remarque : Vous devrez ensuite configurer vos pods de base de données avec les `tolerations` et `nodeSelector` correspondants).*

---

## Étape 3 : Installation de Longhorn (Stockage Distribué)

Longhorn est la solution native recommandée pour K3s. Il réplique vos données sur plusieurs nœuds, assurant qu'elles ne soient pas perdues au redémarrage ou en cas de panne d'un nœud.

### 3.1 - Installation via kubectl
Sur le nœud Master, exécutez la commande suivante pour déployer Longhorn :

```bash
sudo k3s kubectl apply -f https://raw.githubusercontent.com/longhorn/longhorn/v1.6.1/deploy/longhorn.yaml
```

### 3.2 - Vérification
Surveillez le déploiement jusqu'à ce que tous les pods soient dans l'état `Running` :
```bash
sudo k3s kubectl get pods -n longhorn-system --watch
```

### 3.3 - Définir Longhorn comme StorageClass par défaut
K3s inclut "local-path" par défaut. Nous voulons que "longhorn" devienne la solution de stockage par défaut pour vos PVCs.

```bash
# Retirer local-path comme défaut
sudo k3s kubectl patch storageclass local-path -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'

# Mettre Longhorn comme défaut
sudo k3s kubectl patch storageclass longhorn -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

---

## Étape 4 : Déploiement des Persistent Volume Claims (PVC)

Les manifestes PVC pour vos 4 bases de données ont été préparés dans le dossier `k8s/storage/`.
Pour demander le stockage persistant au cluster :

Depuis la racine de votre projet (là où se trouve le dossier `k8s`), lancez :
```bash
kubectl apply -f k8s/storage/
```

Vérifiez ensuite que vos volumes sont correctement provisionnés et attachés (état `Bound`) :
```bash
kubectl get pvc
```
