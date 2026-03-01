import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, Save, Upload, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { getProxiedImageUrl } from '../utils/imageProxy';

// Placeholders for frames and covers that the user will populate later
const APP_FRAMES = [
    'https://i.ibb.co/MksgLLVj/2.png',
    'https://i.ibb.co/pBGNgNXv/3.png',
    'https://i.ibb.co/1YHFByYM/4.png',
    'https://i.ibb.co/Xr7yWLLN/5.png',
    'https://i.ibb.co/PvrmmCss/6.png',
    'https://i.ibb.co/nsyBp6vq/7.png',
    'https://i.ibb.co/Y4jmkk8G/8.png',
    'https://i.ibb.co/ynqZcxTk/9.png',
    'https://i.ibb.co/0phqLcCY/10.png',
    'https://i.ibb.co/HLsJ4b8C/11.png',
    'https://i.ibb.co/CKLVsgQg/20.png',
    'https://i.ibb.co/F4x4hkVx/21.png',
    'https://i.ibb.co/kgLW4Qf0/22.png',
    'https://i.ibb.co/TBLkSQ1g/23.png',
    'https://i.ibb.co/s9bw34Hr/25.png',
    'https://i.ibb.co/5XDgw583/24.png',
    'https://i.ibb.co/SXNQSF7R/a-72d1fd7c47cc7a98c8f64d175773344b.png',
    'https://i.ibb.co/pt3tw5P/036404a048d498394e3847bf4d156c55e7969439.png',
    'https://i.ibb.co/RpBgT5Rw/e89d86814300cd74c2160596cb1936b2db9f58c0.png',
    'https://i.ibb.co/7DHnpj7/3b225d543fc27e1570267bc738e6ad183995790c.png',
    'https://i.ibb.co/rRYXcwx2/17a95655f928f54092fe0364fc4fdce091d0e9fc.png',
    'https://i.ibb.co/1t68Tdhq/64c7df7e54649e990d9c79e14dcbd4e89100873a.png',
    'https://i.ibb.co/WNC8nXxP/a-554b7c34f7b6c709f19535aacb128e7b.png',
    'https://i.ibb.co/nM6jJ7Nt/a-365eed4178528fe8293c4212e8e2d5cb.png',
    'https://i.ibb.co/84xqXDs0/a-fa014594d4b2b4249e1098c0adc85b47.png',
    'https://i.ibb.co/SDYVF8rD/a-250640ab00a8837a1d56f35879138177.png',
    'https://i.ibb.co/xSWn2Jjx/a-a065206df7b011a5510e4e5bca7d49be.png',
    'https://i.ibb.co/wZwjzGQH/a-e90ebc0114e7bdc30353c8b11953ea41.png',
    'https://i.ibb.co/JWwmbS9w/a-5873ecaa76fb549654b40095293f902e.png',
    'https://i.ibb.co/mVvFSxQb/a-77b7b6a740a9451e1ef39c0252154ef8.png',
    'https://i.ibb.co/PHbGLFf/a-f740031cc97d1b7eb73c0d0ac1dd09f3.png',
    'https://i.ibb.co/Ng5N1Sfh/a-49c479e15533fb4c02eb320c9c137433.png',
    'https://i.ibb.co/HTPwMTKB/a-9a6bf0ab30a6719d6eb09fa4996984ca.png',
    'https://i.ibb.co/zHQ2J6nz/a-6d16b27d9415cafe3b289053644337c4.png',
    'https://i.ibb.co/jZbq0Rq4/a-a47890109a231f72dae7b17b27164676.png',
    'https://i.ibb.co/S7KxRQfk/a-8552f9857793aed0cf816f370e2df3be.png',
    'https://i.ibb.co/3yMb13jx/a-ef6fe8b27123eacccebe51c92a61587c.png',
    'https://i.ibb.co/Kz9t4vdS/a-fe63036018fefb8abe3172383497e3bf.png',
    'https://i.ibb.co/kgmGfWZ8/a-d1ea7b8650bf3d64a03304c2ceb7d089.png',
    'https://i.ibb.co/DDbvRQtq/a-1005898c6acf56a9ac5010baf444f6fd.png',
    'https://i.ibb.co/qMK6z1YC/a-a87e3efa4de2956331831681231ce63b.png',
    'https://i.ibb.co/n80NnwXg/a-98555e40cc6802bd3a4fed906af1d992.png',
    'https://i.ibb.co/W4X5cwtD/a-62cd9d7c0031a7c1eb5ad5cc96992189.png',
    'https://i.ibb.co/ccxkF70Y/a-da532f804b47f1681006c2996eb07b2a.png',
    'https://i.ibb.co/jkwR8xyM/a-90e0dce3cc48c4a9607b6d41209c737e.png',
    'https://i.ibb.co/cK77SRQD/a-7cf09c7e78d6eb35ae354acc1d5cc676.png',
    'https://i.ibb.co/Q36VfWyL/a-084353360ae4f9b5b3b5f186e5525de0.png',
    'https://i.ibb.co/hx32RpD4/a-3d1e6078b2e4c8865e0ad0f429d651b1.png',
    'https://i.ibb.co/prnTXNLV/a-13913a00bd9990ab4102a3bf069f0f3f.png',
    'https://i.ibb.co/p6PF9Lhq/a-5087f7f988bd1b2819cac3e33d0150f5.png',
    'https://i.ibb.co/Tx14BF6h/a-720a2045510ec16f9878237d2ff9873f.png',
    'https://i.ibb.co/qYCT7CfZ/a-bc63175fe462d8748b68ea5179249418.png',
    'https://i.ibb.co/fGy25s0P/a-b63917c64ad44020d2d5877a4f91907f.png',
    'https://i.ibb.co/sd82NmMK/a-a44e9335ea869639fdf812f3642a56a6.png',
    'https://i.ibb.co/tw95tpHc/a-eb003dc2b5c6d85c8e18cc9336fcdad3.png',
    'https://i.ibb.co/zhp796Fh/a-5cc3476f582a5649e64ab0a95504c4e9.png',
    'https://i.ibb.co/WN5FjN6D/a-98c7600d304b86ca3b18272e1da05559.png',
    'https://i.ibb.co/v62xm942/a-0e839cd79500e7b68e2bbbed54790c28.png',
    'https://i.ibb.co/WvWyg3m5/a-47c0f4b4a837894998d5a316acf74f87.png',
    'https://i.ibb.co/FqKgh2wX/a-be111e4303d634c55500202a61656e0b.png',
    'https://i.ibb.co/chftnp6Q/a-609fb5c17a4d5ff2e2bec1a1931a9caa.png',
    'https://i.ibb.co/nqTNRGF4/a-27f77b8147892bc271658ba19e4ecc06.png',
    'https://i.ibb.co/wNbfJp0Z/a-af5ee420e5f860ff2cdbb5fa4633f2cf.png',
    'https://i.ibb.co/Z66zZTys/a-fe3c76cac2adf426832a7e495e8329d3.png',
    'https://i.ibb.co/4RFBxKPX/a-8ee8ae54bddfcb17d7d5c5f9bce41c0d.png',
    'https://i.ibb.co/KcCz3rZX/a-b13180be7866281f6fa588a49dd7feb0.png',
    'https://i.ibb.co/p6xcVCTN/a-25f7407a6a0c5de43736a1f24c3b7979.png',
    'https://i.ibb.co/gZkyFJdQ/discord-149.png',
    'https://i.ibb.co/hFY7s0TC/a-63b29ec5b1ea6bb01c2251049838d822.png',
    'https://i.ibb.co/wNkNzzRS/a-9d2ff9685be0c668ef6990b0035fac17.png',
    'https://i.ibb.co/rRcDxY8m/a-9e16d86b2887eb2a3bed36a5b8876935.png',
    'https://i.ibb.co/m5F4cmz0/a-2e55d644e11acb6253dfa422eff16dfd.png',
    'https://i.ibb.co/NdYqG8W2/a-50b440810b1bbd89f6284f36d40ad0af.png',
    'https://i.ibb.co/VkfNTcw/a-d859cee893cffd5dd0fa17a6caea44e0.png',
    'https://i.ibb.co/k6c2x66w/a-fcb0de14da228879b455f1f1d3919749.png',
    'https://i.ibb.co/20M7LPgp/a-7fecc9d20cbbf54644c9a532f7db4664.png',
    'https://i.ibb.co/LXZ7TSFv/a-7f44d538ec830f479605f7bf8720afda.png',
    'https://i.ibb.co/XrhF8fD8/a-b4dcf63b6af2e20cba91af61c0e3a8a7.png',
    'https://i.ibb.co/hF74gyq2/a-555ad9b90a13534180b9274d013e3651.png',
    'https://i.ibb.co/HDc4tMFj/a-e60cc4d7f4d8a6e79dd8cc67d2b13d6c.png',
    'https://i.ibb.co/Lh5vNRZB/a-4cc97277177b166fd7d4af3bdb370815.png',
    'https://i.ibb.co/xSDbY9P7/a-c3cffc19e9784f7d0b005eecdf1b566e.png',
    'https://i.ibb.co/f3rLBP4/a-f3af281c65cf0cf590e9e1f59e9c6cf6.png',
    'https://i.ibb.co/93Bm8KnY/a-d72066b8cecbadd9fc951913ebcc384f.png',
    'https://i.ibb.co/ymQQ9yxJ/a-b98e8b204d59882fb7f9f7c86922c0bf.png',
    'https://i.ibb.co/N2VPQ26m/a-55c9d0354290afa8b7fe47ea9bd7dbcf.png',
    'https://i.ibb.co/wNPWRc6V/a-c7e1751e8122f1b475cb3006966fb28c.png',
    'https://i.ibb.co/WW8DGg8z/a-3c97a2d37f433a7913a1c7b7a735d000.png',
    'https://i.ibb.co/DPtJrggK/a-001e956faa73bd0410c455234c62818f.png',
    'https://i.ibb.co/KxFnTknh/a-44045ae47175eaca4ed1b4d889b62b27.png',
    'https://i.ibb.co/KxBWttWj/a-e0a2df84cf7eb8e098a13e37ec9027c1.png',
    'https://i.ibb.co/CKbW2HbL/a-9661cf3296ac236d8815e3f5b809a467.png',
    'https://i.ibb.co/0pQHyYxR/a-3e1fc3c7ee2e34e8176f4737427e8f4f.png',
    'https://i.ibb.co/JR5ZmJPc/a-45f7f9975255971b197d34d77fb50ede.png',
    'https://i.ibb.co/ymTpLV4j/a-c9761eb6d77eef5d4f10deb6ab4a3d87.png',
    'https://i.ibb.co/jvCn37q4/a-c150c7d7331442961a42d4d580860525.png',
    'https://i.ibb.co/RGzShjkC/a-670b722e56740d11d1e6fe55b8094013.png',
    'https://i.ibb.co/svc47cDs/a-462b0bddc07dd495765fe12abe8b077f.png',
    'https://i.ibb.co/qFpCsrNz/a-6d99f670de3fcee669660fe262e896ea.png',
    'https://i.ibb.co/DPmPf45R/a-fb1fab5c0a30f0a89a7cd5fad873c6f0.png',
    'https://i.ibb.co/rRdz4w7m/a-6912c651e979fbfdc479ed082a571513.png',
    'https://i.ibb.co/xtvdGfff/a-35713167cc82e0f408c26dfc032a7f0f.png',
    'https://i.ibb.co/twq3d7bR/a-49ed38f73003e2e182f77190af0a0a56.png',
    'https://i.ibb.co/HLrLmyC5/a-780cd1b7e878dce85d20c7ee495a86fe.png',
    'https://i.ibb.co/wqfDBsy/a-4774e1f97ebd4a8cc8f71668f3b418e4.png',
    'https://i.ibb.co/twqbWWqQ/a-1e69b40cf0f52b68c511070dd7a29f34.png',
    'https://i.ibb.co/HDsJft53/a-0e50ebc16aa67676687222d0b9b51eb2.png',
    'https://i.ibb.co/b05GzHJ/a-b524fa5c3f80fbea3865a5d130ab5aef.png',
    'https://i.ibb.co/xKL5CFXR/a-f0d55a858c3ceb5d082b3e6a7d2a8fea.png',
    'https://i.ibb.co/21PS6MHS/a-b3c43599032979c61ca6edc5912b77e3.png',
    'https://i.ibb.co/99DXfB3k/a-4945e17c8ddf8ca470e505c07f191400.png',
    'https://i.ibb.co/Cs1jhRSz/a-026b2d22a4a39b7b00c622771ec9b1be.png',
    'https://i.ibb.co/KptTkDgy/a-45635c94cd1dfa196f9711c01cbd7df8.png',
    'https://i.ibb.co/hxQ9KSwm/a-c7febbc41e0673e42f79a79078701660.png',
    'https://i.ibb.co/xWgWjsx/a-5a52022f86ac469d0f4c898fc6ebc1c8.png',
    'https://i.ibb.co/mCNWgQjw/a-b70f0a0cecf3097eae17a8f7d8c659a8.png',
    'https://i.ibb.co/tM0FZhWk/a-0cc586e65b3cd90c27c42477ede2cc97.png',
    'https://i.ibb.co/nqGd6xrb/a-f0199d0589214667224d95fe24ce0106.png',
    'https://i.ibb.co/5hfgm5NP/a-19e053e58025f79b2d5fbb0b891408f1.png',
    'https://i.ibb.co/svKsyzH2/a-81468ad7bd35e0017db82ea35ab63ecb.png',
    'https://i.ibb.co/WpkVc8nd/a-e90a90b63d6ea4d40283bbc19b98a153.png',
    'https://i.ibb.co/xSwnMSXb/a-d24449b1314d7df967b15705fa34b07e.png',
    'https://i.ibb.co/nM2VP0Ms/a-cb8bbe431a4c3b88c11096ff8b46907a.png',
    'https://i.ibb.co/GQCpLFVz/a-71c5b605d5bf95fc43e5335fd760c482.png',
    'https://i.ibb.co/PvLY2pwk/a-a4ab0ff68e61e6508bf325b09cb1e8dd.png',
    'https://i.ibb.co/234YM7bY/a-8de95a1173704216bf5f6ce7f1221bcf.png',
    'https://i.ibb.co/JF2J5GYP/a-d5bbba33a9471255027f590d671ea0ef.png',
    'https://i.ibb.co/QhWpfJS/a-1953da70cb693d9a27178eca180f8cb5.png',
    'https://i.ibb.co/Qx76V4n/a-cec06be6560073121dc9e0bfd9cb536f.png',
    'https://i.ibb.co/PvvgtkYj/a-cffaa50ce82fa79b09e2e0078e8b18bb.png',
    'https://i.ibb.co/Ng9s6RB5/a-cdf52fcac4fec25c759dd493a6f67b94.png',
    'https://i.ibb.co/vv1KYkS6/a-52fd31296f501c7875bd09b0c379c2dd.png',
    'https://i.ibb.co/p6vjRrrs/a-52d234402be84e0f880acaca2ab25c06.png',
    'https://i.ibb.co/spKhL8kd/a-9e815a5c371894d0ce5a15fba9cf999a.png',
    'https://i.ibb.co/B29tCXg3/a-f02912fdcaf063325450b0122d8e4e38.png',
    'https://i.ibb.co/5xWD8JgK/a-3af2ad1b0eb074a2a1691a48a710555a.png',
    'https://i.ibb.co/x8JmBSXP/a-47b3f88e17a2d43a318a5142dc3d788d.png',
    'https://i.ibb.co/cKfTWbgd/a-218a429c396bd5c924d70c0c1358db39.png',
    'https://i.ibb.co/xSWWcRz1/loading.png',
    'https://i.ibb.co/H8T94kR/a-fcb35ee1a73fd3ce46d2cff993afb48e.png',
    'https://i.ibb.co/HLQWgM4h/a-c5692ec4f3d1ead985510fff1e4802c7.png',
    'https://i.ibb.co/n8BxpFfv/a-8464c412fa5d11184e90540413d5752b.png',
    'https://i.ibb.co/gbBXHBtP/a-e7809827e164edde3406af9b9067138d.png',
    'https://i.ibb.co/bMvzPT4T/a-3bc2102f59a5b25882200da18b4e7b12.png',
    'https://i.ibb.co/w8QVTvN/a-e88c3924d8b9b2ba0dac900a39838a32.png',
    'https://i.ibb.co/Pv07RsPM/a-a19b7e105ab06eb1f366a3db6d5651fa.png',
    'https://i.ibb.co/VpbQvnG2/a-94febf08c37b21ee5ed92c49ef98bf00.png',
    'https://i.ibb.co/6cWzg11t/a-70fddceac8bedb9bb317d6891e5521cd.png',
    'https://i.ibb.co/DxkR9DW/a-7b3552536d367435c8fe7bfce8060b89.png',
    'https://i.ibb.co/39McYkpk/a-3513b3b45624e47a4855f6951eea484d.png',
    'https://i.ibb.co/WjDnZrS/a-94191be95bb9c471ff17644f3639eb6d.png',
    'https://i.ibb.co/Xx1TGH5g/a-1ffd338bf104b616ea5774244e46dbf6.png',
    'https://i.ibb.co/nNx7hw23/a-f0f1b123ede61c1ea4a3329af6eedaef.png',
    'https://i.ibb.co/mV1zqg8m/a-9532e6bc08133eb1401c654a4f1a800e.png',
    'https://i.ibb.co/7d6fp7B3/a-476b0b9a8d26b8693c65b401f17a9f2d.png',
    'https://i.ibb.co/qFWszmzR/a-090de51bd780437b83ea95af64e3a20d.png',
    'https://i.ibb.co/gLXSzNVd/a-9c21990636fe5d524f9e5ddd7ee2eb43.png',
    'https://i.ibb.co/jvPtr9QQ/a-8bb33310339200d8d40024583ed95d4a.png',
    'https://i.ibb.co/6RW4ZMb9/a-0c5ed199312f3fe12f1ca2eba2ec9356.png',
    'https://i.ibb.co/9Jryj8Q/a-6f59e75226ea65207068cf672c35b023.png',
    'https://i.ibb.co/tTcrryx5/a-1f45ab29de170384897738fb5585975e.png',
    'https://i.ibb.co/s9xMR31D/a-6357695ea5c6a07227ec4ac36477f36c.png',
    'https://i.ibb.co/rGnkFnqM/a-e2f841b0c3aa46b53d10eb600860c96c.png',
    'https://i.ibb.co/jkk8ZXyc/a-b37c73c8507963c8c02a6b70e61baa43.png',
    'https://i.ibb.co/q3SxBQwj/a-8f1c8cc41169bbba6482f506df2f10c4.png',
    'https://i.ibb.co/ym4G4rQ4/a-04816020a1fcdcecb301fe7c29956a32.png',
    'https://i.ibb.co/84MD15Qb/s9-4.png',
    'https://i.ibb.co/ynP9Z4dY/s9-3.png',
    'https://i.ibb.co/Kx7B0Wfh/s9-2.png',
    'https://i.ibb.co/3YNt6Bxv/s9-1.png',
    'https://i.ibb.co/hJzf6s6R/discord-099.png',
    'https://i.ibb.co/nNZhZWvm/discord-098.png',
    'https://i.ibb.co/K4kSTgX/discord-097.png',
    'https://i.ibb.co/qYjMJ4yq/discord-096.png',
    'https://i.ibb.co/fGDMbn4B/discord-095.png',
    'https://i.ibb.co/nNFmKfzH/discord-094.png',
    'https://i.ibb.co/WjDnZrS/a-94191be95bb9c471ff17644f3639eb6d.png',
    'https://i.ibb.co/WN5FjN6D/a-98c7600d304b86ca3b18272e1da05559.png',
    'https://i.ibb.co/v62xm942/a-0e839cd79500e7b68e2bbbed54790c28.png',
    'https://i.ibb.co/WvWyg3m5/a-47c0f4b4a837894998d5a316acf74f87.png',
    'https://i.ibb.co/FqKgh2wX/a-be111e4303d634c55500202a61656e0b.png',
    'https://i.ibb.co/kP9z7vM/discord-088.png',
    'https://i.ibb.co/DdWZK2m/discord-087.png',
    'https://i.ibb.co/chftnp6Q/a-609fb5c17a4d5ff2e2bec1a1931a9caa.png',
    'https://i.ibb.co/VWRgtcy4/discord-085.png',
    'https://i.ibb.co/WWBhMj8q/discord-084.png',
    'https://i.ibb.co/WvMHnqWV/discord-083.png',
    'https://i.ibb.co/W4fWTtC1/discord-082.png',
    'https://i.ibb.co/N2jbcDQ7/discord-081.png',
    'https://i.ibb.co/nqTNRGF4/a-27f77b8147892bc271658ba19e4ecc06.png',
    'https://i.ibb.co/wNbfJp0Z/a-af5ee420e5f860ff2cdbb5fa4633f2cf.png',
    'https://i.ibb.co/qFPttKxg/discord-078.png',
    'https://i.ibb.co/wh2139c4/discord-077.png',
    'https://i.ibb.co/PsYzqQ5t/discord-076.png',
    'https://i.ibb.co/R4ZFczB5/discord-075.png',
    'https://i.ibb.co/5g0rhCx9/discord-074.png',
    'https://i.ibb.co/KpjMCZLr/discord-073.png',
    'https://i.ibb.co/3Yf9LH7v/discord-072.png',
    'https://i.ibb.co/WNGk4xz0/discord-071.png',
    'https://i.ibb.co/0jdQZMbg/discord-070.png',
    'https://i.ibb.co/jPPc2wnG/discord-069.png',
    'https://i.ibb.co/Y7pXrVj5/discord-068.png',
    'https://i.ibb.co/VWMFM6NY/discord-067.png',
    'https://i.ibb.co/jP5mrGWQ/discord-066.png',
    'https://i.ibb.co/fYKzwR4Z/discord-065.png',
    'https://i.ibb.co/bMYPH6SC/discord-064.png',
    'https://i.ibb.co/8gpgRtzf/discord-063.png',
    'https://i.ibb.co/84nDFXjW/discord-062.png',
    'https://i.ibb.co/xSVFpB9V/discord-061.png',
    'https://i.ibb.co/0phZp2yp/discord-060.png',
    'https://i.ibb.co/Qjhb1csn/discord-059.png',
    'https://i.ibb.co/Fqzg897k/discord-058.png',
    'https://i.ibb.co/S4TRxZ5k/discord-057.png',
    'https://i.ibb.co/1tXjFYKt/discord-056.png',
    'https://i.ibb.co/n8rRn8rc/discord-055.png',
    'https://i.ibb.co/Ls93kPW/discord-054.png',
    'https://i.ibb.co/23TpQZFh/discord-053.png',
    'https://i.ibb.co/Y4DLdwz0/discord-052.png',
    'https://i.ibb.co/kgNLv22d/discord-051.png',
    'https://i.ibb.co/2YNt8g8J/discord-050.png',
    'https://i.ibb.co/Z66zZTys/a-fe3c76cac2adf426832a7e495e8329d3.png',
    'https://i.ibb.co/PZk682bK/discord-048.png',
    'https://i.ibb.co/Z6bBtxf2/discord-047.png',
    'https://i.ibb.co/3YYQts8w/discord-046.png',
    'https://i.ibb.co/4RFBxKPX/a-8ee8ae54bddfcb17d7d5c5f9bce41c0d.png',
    'https://i.ibb.co/p6xcVCTN/a-25f7407a6a0c5de43736a1f24c3b7979.png',
    'https://i.ibb.co/KcCz3rZX/a-b13180be7866281f6fa588a49dd7feb0.png',
    'https://i.ibb.co/twnyNbKm/discord-042.png',
    'https://i.ibb.co/SXNQSF7R/a-72d1fd7c47cc7a98c8f64d175773344b.png',
    'https://i.ibb.co/3mVq2MxV/discord-040.png',
    'https://i.ibb.co/gbMw4n7W/discord-039.png',
    'https://i.ibb.co/pjzNRzJ1/discord-038.png',
    'https://i.ibb.co/qLg4bW5h/discord-037.png',
    'https://i.ibb.co/V02cPpSV/discord-036.png',
    'https://i.ibb.co/Fk7f4ySw/discord-035.png',
    'https://i.ibb.co/1JpqWZbZ/discord-034.png',
    'https://i.ibb.co/xKsDmv9c/discord-033.png',
    'https://i.ibb.co/NdYqG8W2/a-50b440810b1bbd89f6284f36d40ad0af.png',
    'https://i.ibb.co/p66RZg6X/discord-031.png',
    'https://i.ibb.co/hFY7s0TC/a-63b29ec5b1ea6bb01c2251049838d822.png',
    'https://i.ibb.co/wNkNzzRS/a-9d2ff9685be0c668ef6990b0035fac17.png',
    'https://i.ibb.co/rRcDxY8m/a-9e16d86b2887eb2a3bed36a5b8876935.png',
    'https://i.ibb.co/m5F4cmz0/a-2e55d644e11acb6253dfa422eff16dfd.png',
    'https://i.ibb.co/FN6hSxY/discord-026.png',
    'https://i.ibb.co/BKq2bNXn/discord-025.png',
    'https://i.ibb.co/VkfNTcw/a-d859cee893cffd5dd0fa17a6caea44e0.png',
    'https://i.ibb.co/ns9G8x4M/discord-023.png',
    'https://i.ibb.co/JWR4rWhF/discord-022.png',
    'https://i.ibb.co/qFYzRVKq/discord-021.png',
    'https://i.ibb.co/9HpyQWpH/discord-020.png',
    'https://i.ibb.co/4gVbKD2G/discord-019.png',
    'https://i.ibb.co/20M7LPgp/a-7fecc9d20cbbf54644c9a532f7db4664.png',
    'https://i.ibb.co/hF74gyq2/a-555ad9b90a13534180b9274d013e3651.png',
    'https://i.ibb.co/jvb1NdpN/discord-016.png',
    'https://i.ibb.co/Lh5vNRZB/a-4cc97277177b166fd7d4af3bdb370815.png',
    'https://i.ibb.co/8gbXtPNt/discord-014.png',
    'https://i.ibb.co/f3rLBP4/a-f3af281c65cf0cf590e9e1f59e9c6cf6.png',
    'https://i.ibb.co/6R4S1psP/discord-012.png',
    'https://i.ibb.co/ymQQ9yxJ/a-b98e8b204d59882fb7f9f7c86922c0bf.png',
    'https://i.ibb.co/93Bm8KnY/a-d72066b8cecbadd9fc951913ebcc384f.png',
    'https://i.ibb.co/LzwYpB7T/discord-009.png',
    'https://i.ibb.co/N2VPQ26m/a-55c9d0354290afa8b7fe47ea9bd7dbcf.png',
    'https://i.ibb.co/wNPWRc6V/a-c7e1751e8122f1b475cb3006966fb28c.png',
    'https://i.ibb.co/KxFnTknh/a-44045ae47175eaca4ed1b4d889b62b27.png',
    'https://i.ibb.co/JR5ZmJPc/a-45f7f9975255971b197d34d77fb50ede.png',
    'https://i.ibb.co/DPtJrggK/a-001e956faa73bd0410c455234c62818f.png',
    'https://i.ibb.co/LX40jSJw/discord-003.png',
    'https://i.ibb.co/xtcWf4sH/discord-002.png',
    'https://i.ibb.co/0pQHyYxR/a-3e1fc3c7ee2e34e8176f4737427e8f4f.png',
    'https://i.ibb.co/dXwBC7d/s4-1.png',
    'https://i.ibb.co/TMFdQtx9/s3-4.png',
    'https://i.ibb.co/ZRKLkV7D/s3-3.png',
    'https://i.ibb.co/zT29y0nw/s3-2.png',
    'https://i.ibb.co/7JrnB7h2/s3-1.png',
    'https://i.ibb.co/WNp7pCqS/s2-5.png',
    'https://i.ibb.co/HprcvZ1C/s2-4.png',
    'https://i.ibb.co/ksJphwq9/s2-3.png',
    'https://i.ibb.co/bRvrzY36/s2-2.png',
    'https://i.ibb.co/wkLC6Wx/s2-1.png',
    'https://i.ibb.co/dJw0tmfk/s1-13.png',
    'https://i.ibb.co/V0KcvkqV/s1-12.png',
    'https://i.ibb.co/xKMkgBvc/s1-11.png',
    'https://i.ibb.co/Fk3RnjKt/s1-10.png',
    'https://i.ibb.co/jZJDzBDf/s1-9.png',
    'https://i.ibb.co/sp6VVgKZ/s1-8.png',
    'https://i.ibb.co/9mj6ZJpf/s1-7.png',
    'https://i.ibb.co/gbnXLJnC/s1-6.png',
    'https://i.ibb.co/Kxk0mcpf/s1-5.png',
    'https://i.ibb.co/xS1mLY3t/s1-4.png',
    'https://i.ibb.co/7tJ3Cq6W/s1-3.png',
    'https://i.ibb.co/GfPYpFjY/s1-2.png',
    'https://i.ibb.co/5XdGds7M/s1-1.png',
    'https://i.ibb.co/qYkkBNbb/discord-100.png',
    'https://i.ibb.co/YFy19tXX/discord-101.png',
    'https://i.ibb.co/W4w6Grp7/discord-102.png',
    'https://i.ibb.co/8DMbrGBv/discord-103.png',
    'https://i.ibb.co/1GFQC7sK/discord-104.png',
    'https://i.ibb.co/qLbn0QcM/discord-105.png',
    'https://i.ibb.co/357XTN3r/discord-106.png',
    'https://i.ibb.co/pjQY5dmx/discord-107.png',
    'https://i.ibb.co/DcWXnzL/discord-108.png',
    'https://i.ibb.co/TMsWjbKD/discord-109.png',
    'https://i.ibb.co/tw95tpHc/a-eb003dc2b5c6d85c8e18cc9336fcdad3.png',
    'https://i.ibb.co/sd82NmMK/a-a44e9335ea869639fdf812f3642a56a6.png',
    'https://i.ibb.co/fGy25s0P/a-b63917c64ad44020d2d5877a4f91907f.png',
    'https://i.ibb.co/VWdqsXn4/discord-113.png',
    'https://i.ibb.co/TM8WZ4t8/discord-114.png',
    'https://i.ibb.co/JMc1cPt/discord-115.png',
    'https://i.ibb.co/p6PF9Lhq/a-5087f7f988bd1b2819cac3e33d0150f5.png',
    'https://i.ibb.co/qYCT7CfZ/a-bc63175fe462d8748b68ea5179249418.png',
    'https://i.ibb.co/Tx14BF6h/a-720a2045510ec16f9878237d2ff9873f.png',
    'https://i.ibb.co/hx32RpD4/a-3d1e6078b2e4c8865e0ad0f429d651b1.png',
    'https://i.ibb.co/Q36VfWyL/a-084353360ae4f9b5b3b5f186e5525de0.png',
    'https://i.ibb.co/VYjY4wLh/discord-121.png',
    'https://i.ibb.co/3mbqVB0v/discord-122.png',
    'https://i.ibb.co/jkwR8xyM/a-90e0dce3cc48c4a9607b6d41209c737e.png',
    'https://i.ibb.co/ccxkF70Y/a-da532f804b47f1681006c2996eb07b2a.png',
    'https://i.ibb.co/W4X5cwtD/a-62cd9d7c0031a7c1eb5ad5cc96992189.png',
    'https://i.ibb.co/G31pqBgg/discord-126.png',
    'https://i.ibb.co/0pXWVJMr/discord-127.png',
    'https://i.ibb.co/qM6wStw0/discord-128.png',
    'https://i.ibb.co/qMK6z1YC/a-a87e3efa4de2956331831681231ce63b.png',
    'https://i.ibb.co/LDv1hCMp/discord-130.png',
    'https://i.ibb.co/DDbvRQtq/a-1005898c6acf56a9ac5010baf444f6fd.png',
    'https://i.ibb.co/ZzvmTbq2/discord-132.png',
    'https://i.ibb.co/fzfh4t8Y/discord-133.png',
    'https://i.ibb.co/kgmGfWZ8/a-d1ea7b8650bf3d64a03304c2ceb7d089.png',
    'https://i.ibb.co/Kz9t4vdS/a-fe63036018fefb8abe3172383497e3bf.png',
    'https://i.ibb.co/3yMb13jx/a-ef6fe8b27123eacccebe51c92a61587c.png',
    'https://i.ibb.co/jZbq0Rq4/a-a47890109a231f72dae7b17b27164676.png',
    'https://i.ibb.co/HTPwMTKB/a-9a6bf0ab30a6719d6eb09fa4996984ca.png',
    'https://i.ibb.co/bTzMprs/discord-179.png',
    'https://i.ibb.co/PZf2bWfc/discord-178.png',
    'https://i.ibb.co/8LchQBMf/discord-177.png',
    'https://i.ibb.co/7dw6Xv4Z/discord-176.png',
    'https://i.ibb.co/rGvKS17s/discord-175.png',
    'https://i.ibb.co/mCNnZS7g/discord-174.png',
    'https://i.ibb.co/nqWZ2rRV/discord-173.png',
    'https://i.ibb.co/JW4Xg2QR/discord-172.png',
    'https://i.ibb.co/4ZH8DQ02/discord-171.png',
    'https://i.ibb.co/xKsStFdJ/discord-170.png',
    'https://i.ibb.co/PzMnfKKw/discord-169.png',
    'https://i.ibb.co/Q7ZM2kXj/discord-168.png',
    'https://i.ibb.co/FcwzZQz/discord-167.png',
    'https://i.ibb.co/TqLz9wXS/discord-166.png',
    'https://i.ibb.co/39PVRhGV/discord-165.png',
    'https://i.ibb.co/PGMFNPpr/discord-164.png',
    'https://i.ibb.co/7JhqRvRT/discord-163.png',
    'https://i.ibb.co/8L8PRPhj/discord-162.png',
    'https://i.ibb.co/CpLbqrtP/discord-161.png',
    'https://i.ibb.co/q3kzmktB/discord-160.png',
    'https://i.ibb.co/cXyQ5FDD/discord-159.png',
    'https://i.ibb.co/35P1VR56/discord-158.png',
    'https://i.ibb.co/QjTsVft6/discord-157.png',
    'https://i.ibb.co/fYSGVLCs/discord-156.png',
    'https://i.ibb.co/Y7ZwyMf8/discord-155.png',
    'https://i.ibb.co/nM6jJ7Nt/a-365eed4178528fe8293c4212e8e2d5cb.png',
    'https://i.ibb.co/84xqXDs0/a-fa014594d4b2b4249e1098c0adc85b47.png',
    'https://i.ibb.co/WNC8nXxP/a-554b7c34f7b6c709f19535aacb128e7b.png',
    'https://i.ibb.co/SDYVF8rD/a-250640ab00a8837a1d56f35879138177.png',
    'https://i.ibb.co/xSWn2Jjx/a-a065206df7b011a5510e4e5bca7d49be.png',
    'https://i.ibb.co/qFpYh1X3/discord-148.png',
    'https://i.ibb.co/DDFj1D0S/discord-147.png',
    'https://i.ibb.co/CKjKFQrt/discord-146.png',
    'https://i.ibb.co/JWwmbS9w/a-5873ecaa76fb549654b40095293f902e.png',
    'https://i.ibb.co/jPmJ4xP8/discord-144.png',
    'https://i.ibb.co/whsz8Lbm/discord-143.png',
    'https://i.ibb.co/PHbGLFf/a-f740031cc97d1b7eb73c0d0ac1dd09f3.png',
    'https://i.ibb.co/Ng5N1Sfh/a-49c479e15533fb4c02eb320c9c137433.png',
    'https://i.ibb.co/5x195d7w/discord-139.png',
    'https://i.ibb.co/kVKgdy6C/discord-140.png',



];

const APP_COVERS = [
    'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1200&auto=format&fit=crop'
];

// Helper function to extract cropped image map using canvas
const getCroppedImg = async (imageSrc: string, crop: Area): Promise<string> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No 2d context');
    }

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const base64data = reader.result as string;
                resolve(base64data.split(',')[1]);
            };
        }, 'image/jpeg', 0.9);
    });
};

const EditProfile = () => {
    const navigate = useNavigate();
    const { user, login, token } = useAuth();
    const { t } = useSettings();

    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [originalCoverUrl, setOriginalCoverUrl] = useState('');
    const [avatarFrameUrl, setAvatarFrameUrl] = useState('');

    const [activeTab, setActiveTab] = useState<'all' | 'frames' | 'covers'>('frames');

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cropper State
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isCropping, setIsCropping] = useState(false);

    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Populate existing user data
    useEffect(() => {
        if (!user) {
            navigate('/settings');
            return;
        }

        const fetchProfile = async () => {
            try {
                const res = await axios.get('/api/profile');
                if (res.data.user) {
                    setDisplayName(res.data.user.display_name || '');
                    setBio(res.data.user.bio || '');
                    setAvatarUrl(res.data.user.avatar_url || '');
                    setCoverUrl(res.data.user.cover_url || '');
                    setAvatarFrameUrl(res.data.user.avatar_frame_url || '');

                    if (res.data.user.cover_url && !APP_COVERS.includes(res.data.user.cover_url)) {
                        setOriginalCoverUrl(res.data.user.cover_url);
                    }

                    // Update local auth cache silently if needed
                    login(token as string, { ...user, ...res.data.user });
                }
            } catch (err) {
                console.error('Failed to fetch profile', err);
            }
        };

        fetchProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Triggered when standard upload finishes
    const uploadImage = async (base64Data: string, isCover: boolean) => {
        if (isCover) setIsUploadingCover(true);
        else setIsUploadingAvatar(true);

        try {
            const res = await axios.post('/api/upload', { image: base64Data });
            if (res.data.url) {
                if (isCover) {
                    setCoverUrl(res.data.url);
                    setOriginalCoverUrl(res.data.url);
                }
                else setAvatarUrl(res.data.url);
                toast.success(t('profile.upload_success') || 'Image uploaded successfully!');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error(t('profile.upload_failed') || 'Failed to upload image.');
        } finally {
            if (isCover) setIsUploadingCover(false);
            else setIsUploadingAvatar(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input immediately so same file can be selected again
        e.target.value = '';

        const reader = new FileReader();
        reader.onload = (event) => {
            const imgSrc = event.target?.result as string;

            if (!isCover) {
                // For avatars, open the cropper instead of uploading directly
                setCropImageSrc(imgSrc);
                setIsCropping(true);
                return;
            }

            // Cover handling (compress and upload immediately)
            if (file.type === 'image/gif') {
                const base64String = imgSrc.split(',')[1];
                uploadImage(base64String, true);
            } else {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 600;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                    uploadImage(resizedBase64, true);
                };
                img.src = imgSrc;
            }
        };
        reader.readAsDataURL(file);
    };

    const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleCropAccept = async () => {
        if (!cropImageSrc || !croppedAreaPixels) return;
        setIsCropping(false);
        setIsUploadingAvatar(true);
        try {
            const base64Data = await getCroppedImg(cropImageSrc, croppedAreaPixels);
            await uploadImage(base64Data, false);
        } catch (error) {
            console.error('Cropper compilation failed:', error);
            toast.error('Failed to process image');
            setIsUploadingAvatar(false);
        }
    };

    const handleCropCancel = () => {
        setIsCropping(false);
        setCropImageSrc(null);
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const res = await axios.put('/api/profile', {
                avatar_url: avatarUrl,
                cover_url: coverUrl,
                display_name: displayName,
                bio: bio,
                avatar_frame_url: avatarFrameUrl
            });

            if (res.data.user) {
                login(token as string, { ...user, ...res.data.user });
                toast.success(t('profile.save_success') || 'Profile successfully updated!');
                navigate('/settings');
            }
        } catch (error) {
            console.error('Save profile failed:', error);
            toast.error(t('profile.save_failed') || 'Failed to save profile.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render lists for the left pane tabs
    const renderFramesList = () => (
        <div className="grid grid-cols-3 gap-3 pr-2 overflow-y-auto max-h-[400px] custom-scrollbar pb-2">
            <div
                onClick={() => setAvatarFrameUrl('')}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all flex items-center justify-center bg-[#222] ${!avatarFrameUrl ? 'border-[var(--color-primary)] scale-105 shadow-lg z-10' : 'border-transparent opacity-80 hover:opacity-100'}`}
                title="Sử dụng avatar gốc (Không viền)"
            >
                {/* Show their actual avatar without frame */}
                {avatarUrl ? (
                    <img src={getProxiedImageUrl(avatarUrl)} alt="No Frame" className="w-[60%] h-[60%] object-cover rounded-full filter drop-shadow-md opacity-50" loading="lazy" />
                ) : (
                    <div className="w-[60%] h-[60%] rounded-full flex justify-center items-center text-4xl font-bold text-gray-400 bg-[#333] opacity-50">
                        {displayName?.charAt(0)?.toUpperCase() || user?.username.charAt(0).toUpperCase()}
                    </div>
                )}
                <span className="absolute text-xs text-white uppercase font-bold tracking-widest text-center z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{t('profile.no_frame') || 'NONE'}</span>
            </div>
            {APP_FRAMES.map((f, i) => (
                <div
                    key={`frame-${i}`}
                    onClick={() => setAvatarFrameUrl(f)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${avatarFrameUrl === f ? 'border-[#8C8CFF] scale-105 shadow-lg' : 'border-transparent bg-[#222] opacity-80 hover:opacity-100 hover:scale-105'}`}
                >
                    <div className="w-full h-full flex items-center justify-center p-2 relative">
                        <img src={getProxiedImageUrl(f)} alt={`Frame ${i}`} className="w-full h-full object-contain filter drop-shadow-md" loading="lazy" />
                    </div>
                </div>
            ))}
        </div>
    );

    const renderCoversList = () => (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pr-2 overflow-y-auto max-h-[400px] custom-scrollbar pb-2">
            {/* Custom Upload Button Slot */}
            <div
                onClick={() => coverInputRef.current?.click()}
                className="aspect-[3/1] rounded-lg overflow-hidden border-2 border-dashed border-[var(--color-border)] cursor-pointer transition-all flex flex-col items-center justify-center bg-[var(--color-surface)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-[var(--color-text-muted)]"
            >
                {isUploadingCover ? (
                    <Loader2 className="animate-spin mb-1" size={24} />
                ) : (
                    <>
                        <Upload size={24} className="mb-1" />
                        <span className="text-xs font-medium">Tải ảnh lên</span>
                    </>
                )}
            </div>

            <div
                onClick={() => setCoverUrl(originalCoverUrl)}
                className={`relative aspect-[3/1] rounded-lg overflow-hidden border-2 cursor-pointer transition-all flex items-center justify-center bg-[#222] ${coverUrl === originalCoverUrl ? 'border-[var(--color-primary)] scale-105 shadow-lg z-10' : 'border-transparent opacity-80 hover:opacity-100'}`}
                title="Sử dụng ảnh gốc"
            >
                {/* Fallback pattern or actual cover image */}
                {originalCoverUrl ? (
                    <img src={getProxiedImageUrl(originalCoverUrl)} alt="Original Cover" className="w-full h-full object-cover opacity-50 filter drop-shadow-md" loading="lazy" />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-[#111] to-[#222]" />
                )}
                <span className="absolute text-xs text-white uppercase font-bold tracking-widest text-center z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{t('profile.no_cover') || 'NONE'}</span>
            </div>

            {APP_COVERS.map((c, i) => (
                <div
                    key={`cover-${i}`}
                    onClick={() => setCoverUrl(c)}
                    className={`aspect-[3/1] rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${coverUrl === c ? 'border-[var(--color-primary)] scale-105 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'}`}
                >
                    <img src={getProxiedImageUrl(c)} alt={`Cover ${i}`} className="w-full h-full object-cover" loading="lazy" />
                </div>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-[var(--color-text)]">
            {/* Header */}
            <header className="shrink-0 bg-[var(--color-surface)] flex items-center h-14 px-2 shadow-sm border-b border-[var(--color-border)] justify-between z-10">
                <div className="flex items-center">
                    <button
                        onClick={() => navigate('/settings')}
                        className="p-2 rounded-full hover:bg-[#333] transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-medium ml-2">{t('profile.edit_title') || 'Edit Profile'}</h1>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-1.5 rounded-full bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity mr-2"
                >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    <span className="text-sm">{t('profile.save') || 'Save'}</span>
                </button>
            </header>

            <div className="flex-1 p-4 md:p-6 pb-20">
                <div className="max-w-6xl mx-auto flex flex-col gap-6">

                    {/* TOP SECTION: Wide Card */}
                    <div className="relative w-full h-56 md:h-64 rounded-xl overflow-hidden shadow-xl border border-[var(--color-border)] bg-[#1a1a1a]">
                        {/* Cover Image Background */}
                        <div className="absolute inset-0 z-0 bg-[#000]">
                            {coverUrl ? (
                                <img src={getProxiedImageUrl(coverUrl)} alt="Cover" className="w-full h-full object-cover opacity-60" />
                            ) : null}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                        </div>

                        {/* Content inside top card */}
                        <div className="absolute inset-0 p-6 flex items-center gap-6 z-10">
                            {/* Avatar Container with Overlays */}
                            <div className="relative group shrink-0" title="Click to upload custom Avatar">
                                <div
                                    className="relative w-28 h-28 rounded-full border-[3px] border-[#222] bg-[#1e1e1e] cursor-pointer overflow-hidden shadow-2xl"
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    {avatarUrl ? (
                                        <img src={getProxiedImageUrl(avatarUrl)} alt="Avatar" className="w-[110%] h-[110%] object-cover absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    ) : (
                                        <div className="w-full h-full flex justify-center items-center text-4xl font-bold text-gray-400 bg-[#333]">
                                            {displayName?.charAt(0)?.toUpperCase() || user?.username.charAt(0).toUpperCase()}
                                        </div>
                                    )}

                                    {/* Uploading Spinner Overlay */}
                                    {isUploadingAvatar && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                            <Loader2 size={24} className="text-[var(--color-primary)] animate-spin" />
                                        </div>
                                    )}

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <Camera size={24} className="text-white drop-shadow-md" />
                                    </div>
                                </div>

                                {/* Frame Overlay */}
                                {avatarFrameUrl && (
                                    <div className="absolute -inset-4 pointer-events-none z-20">
                                        <img src={getProxiedImageUrl(avatarFrameUrl)} alt="Frame" className="w-full h-full object-contain filter drop-shadow-md" />
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col flex-1 text-white">
                                <h2 className="text-3xl font-bold tracking-wide drop-shadow-lg">
                                    {displayName || user?.username}
                                </h2>
                                <p className="text-sm text-gray-300 mt-1 drop-shadow-md">
                                    {bio || "Level 1 Member"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM SECTION: Two Columns */}
                    <div className="flex flex-col md:flex-row gap-8">

                        {/* LEFT COLUMN: Tabs and Lists */}
                        <div className="w-full md:w-1/2 lg:w-3/5 flex flex-col gap-4">
                            <div className="flex border-b border-[var(--color-border)] gap-2 pb-2">
                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'all' ? 'bg-[#292942] text-[#8C8CFF]' : 'text-[var(--color-text)] hover:bg-[#222]'}`}
                                >
                                    Toàn Bộ
                                </button>
                                <button
                                    onClick={() => setActiveTab('frames')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors border ${activeTab === 'frames' ? 'border-[#8C8CFF] text-[#8C8CFF]' : 'border-transparent text-[var(--color-text)] hover:bg-[#222]'}`}
                                >
                                    Khung Viền
                                </button>
                                <button
                                    onClick={() => setActiveTab('covers')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors border ${activeTab === 'covers' ? 'border-[#8C8CFF] text-[#8C8CFF]' : 'border-transparent text-[var(--color-text)] hover:bg-[#222]'}`}
                                >
                                    Ảnh Bìa
                                </button>
                            </div>

                            <div className="flex flex-col gap-8 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                                {activeTab === 'frames' && (
                                    <div>
                                        <h3 className="text-sm font-semibold mb-4 text-[#8C8CFF] uppercase tracking-wider">Khung viền có sẵn</h3>
                                        {renderFramesList()}
                                    </div>
                                )}

                                {activeTab === 'covers' && (
                                    <div>
                                        <h3 className="text-sm font-semibold mb-4 text-[#8C8CFF] uppercase tracking-wider">Ảnh bìa hệ thống</h3>
                                        {renderCoversList()}
                                    </div>
                                )}

                                {activeTab === 'all' && (
                                    <div className="flex flex-col gap-8">
                                        <div>
                                            <h3 className="text-sm font-semibold mb-4 text-[#8C8CFF] uppercase tracking-wider">Khung viền có sẵn</h3>
                                            {renderFramesList()}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold mb-4 text-[#8C8CFF] uppercase tracking-wider">Ảnh bìa hệ thống</h3>
                                            {renderCoversList()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Personal Info Form */}
                        <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col gap-6">
                            <h3 className="text-sm font-semibold text-[#8C8CFF] uppercase tracking-wider pb-2 border-b border-[var(--color-border)]">
                                Thông tin cá nhân
                            </h3>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-[var(--color-text-muted)]">
                                    Tên hiển thị
                                </label>
                                <input
                                    type="text"
                                    maxLength={50}
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    placeholder={user?.username}
                                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-md px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[#8C8CFF] transition-colors"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-[var(--color-text-muted)]">
                                    Tiểu sử
                                </label>
                                <textarea
                                    maxLength={300}
                                    rows={4}
                                    value={bio}
                                    onChange={e => setBio(e.target.value)}
                                    placeholder="Chia sẻ điều gì đó về bạn..."
                                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-md px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[#8C8CFF] transition-colors resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={avatarInputRef}
                    onChange={(e) => handleFileChange(e, false)}
                />

                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={coverInputRef}
                    onChange={(e) => handleFileChange(e, true)}
                />
            </div>

            {/* Cropper Modal */}
            {isCropping && cropImageSrc && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
                    <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-white/10">
                        <button onClick={handleCropCancel} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
                            <X size={24} />
                        </button>
                        <h2 className="text-white font-medium">{t('profile.crop_title') || 'Edit Image'}</h2>
                        <button
                            onClick={handleCropAccept}
                            disabled={isUploadingAvatar}
                            className="bg-[var(--color-primary)] text-white px-4 py-1.5 rounded-full font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                        >
                            {isUploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {t('profile.crop_done') || 'Done'}
                        </button>
                    </div>
                    <div className="relative flex-1 bg-black">
                        {/* @ts-ignore */}
                        <Cropper
                            image={cropImageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>
                    <div className="h-24 shrink-0 bg-[#111] border-t border-white/10 flex items-center justify-center px-6">
                        <div className="w-full max-w-sm flex items-center gap-4">
                            <span className="text-white/50 text-xs truncate max-w-20">{t('profile.crop_zoom_out') || 'Zoom out'}</span>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                            />
                            <span className="text-white/50 text-xs truncate max-w-20">{t('profile.crop_zoom_in') || 'Zoom in'}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditProfile;
