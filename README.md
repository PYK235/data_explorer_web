# Smart Data Explorer Frontend

Day la phan bai lam cho Thanh vien 1: frontend va giao dien nguoi dung.

## Noi dung da lam

- Giao dien tong the dang dashboard co sidebar/menu.
- Trang upload file CSV/Excel.
- Trang hien thi du lieu sau khi upload.
- Khu vuc chon thuat toan `K-Means`, `DBSCAN`, `Hierarchical`.
- Khu vuc hien thi ket qua phan cum va bieu do.
- Split-screen de so sanh 3 thuat toan tren cung man hinh.
- Cac thanh phan UI: nut upload, bo loc du lieu, thanh chon so cum `k`, slider cat dendrogram.

## Cau truc file de noi backend de hon

- `js/app.js`: diem khoi tao chinh.
- `js/state/appState.js`: state dung chung cua frontend.
- `js/dom/elements.js`: tap hop cac phan tu DOM.
- `js/data/mockData.js`: du lieu mau va cau hinh demo cho tung thuat toan.
- `js/services/fileParser.js`: doc va parse file CSV.
- `js/services/api.js`: noi de goi backend Flask/FastAPI sau nay.
- `js/renderers/tableRenderer.js`: render bang du lieu.
- `js/renderers/chartRenderer.js`: render scatter plot va bar chart.
- `js/controllers/datasetController.js`: loc va cap nhat du lieu hien thi.
- `js/controllers/chartController.js`: cap nhat metric va bieu do.
- `js/controllers/uiController.js`: dong bo cac control UI.
- `js/controllers/eventBinder.js`: gan su kien nut bam, slider, upload file.

## Cach mo

1. Mo file `index.html` bang trinh duyet.
2. Bam `Dung du lieu mau` de xem demo nhanh.
3. Co the upload file `.csv` de thay preview bang du lieu moi.

## Ghi chu

- Ban demo nay uu tien frontend de nop bai.
- File Excel da co giao dien upload san, nhung can noi backend hoac thu vien doc Excel de xem du lieu thuc te.
- Khi nhom ghep voi backend, co the thay du lieu mau bang API tra ve tu Flask/FastAPI trong file `js/services/api.js`.
