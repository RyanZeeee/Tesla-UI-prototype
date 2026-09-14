# 车控设置内容与资料依据

项目包含八个车控分类，采用侧边导航结构和抽屉动效。内容参考 Tesla 中国版 Model 3（2017–2023）车主手册，适配原型现有车型；不是某个软件版本的逐项复刻。部分配置、名称和可用功能会因生产年份及车辆软件而变化。

## 分类与来源

| 页面 | 补充内容 | 官方依据 |
| --- | --- | --- |
| 控制 | 屏幕亮度、灯光、后视镜、方向盘、折叠后视镜、雨刮、手套箱、车窗锁 | [触摸屏](https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/GUID-518C51C1-E9AC-4A68-AE12-07F4FF8C881E.html)、[方向盘](https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/GUID-DEB259CC-ABAC-4BFC-8D10-B7B1BBCFCB1F.html) |
| 辅助驾驶 | 巡航模式、跟车距离、车速偏移、车道偏离、盲区摄像头、碰撞预警及紧急制动 | [辅助转向](https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/GUID-20F2262F-CDF6-408E-A752-2AD9B0CC2FD6.html)、[车道辅助](https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/GUID-ADA05DFF-963D-477D-9A51-FA8C8F6429F1.html)、[避撞辅助](https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/GUID-8EA7EF10-7D27-42AC-A31A-96BCE5BC0A85.html) |
| 车灯 | 外部车灯、前后雾灯、自适应照明、伴我回家、灯光调节、顶灯与氛围灯 | [车灯](https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/GUID-371B94E9-E74F-4BBB-9A55-5F4182894B99.html) |
| 车锁 | 演示钥匙的增删改、离车落锁、驾驶员解锁、驻车解锁、儿童锁、车窗锁和提醒 | [车门](https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/GUID-7A32EC01-A17E-42CC-A15B-2E0A39FD07AB.html) |
| 显示 | 外观预览、亮度、蓝光、字号、时间格式、电量显示、计量单位、语言和滚轮功能 | [触摸屏](https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/GUID-518C51C1-E9AC-4A68-AE12-07F4FF8C881E.html) |
| 动态 | 加速、转向力度、能量回收、停止模式、补充制动和脱困起步 | [加速模式](https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/GUID-8EAFF5D8-7209-45ED-A7E0-508FFA60C530.html)、[制动和停止](https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/GUID-3DFFB071-C0F6-474D-8A45-17BE1A006365.html) |
| 安全 | 哨兵、行车记录仪、手机访问、Joe 降音、演示 PIN、速度限制和电源流程 | [安全设置](https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/GUID-94B0E05E-F642-4C8E-8FED-E5EB45FA27DA.html)、[哨兵模式](https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/GUID-56703182-8191-4DAE-AF07-2FDC0EB64663.html)、[行车记录仪](https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/GUID-3BCC07CE-5EA2-4F40-99D1-27690898FF3C.html) |
| 服务 | 胎压示例、轮毂与轮胎、保养建议、雨刮维护、摄像头校准、洗车、牵引、手册和重置 | [保养](https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/GUID-E95DAAD9-646E-4249-9930-B109ED7B1D91.html)、[摄像头](https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/GUID-682FF4A7-D083-4C95-925A-5EE3752F4865.html)、[清洁与洗车模式](https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/GUID-65384C1F-86F2-44E8-A8BC-8A12E7E00A40.html) |

## 原型交互范围

- 所有选项可操作；存在依赖的选项按状态禁用。控制页与车灯、显示页共享相关设置。
- 亮度、外观、单位、驾驶模式等在车控预览或相关车控页面体现，不改变既有主界面和车模。车模灯光仍按此前要求常亮。
- 设置偏好、调节位置和演示钥匙存于浏览器本地；读取时验证类型、范围和选项。清洁模式、洗车模式、牵引模式等临时状态不会在刷新后恢复。
- 洗车模式临时覆盖雨刮和离车自动上锁，退出后保留原偏好。速度限制启用时选择舒适加速，禁止切换为标准。
- 后视镜、方向盘和灯光调节提供方向按钮及位置预览，支持保存和取消，不直接驱动车模零件。
- 钥匙和 PIN 仅为交互演示；PIN 只保存启用标记，不保存输入数字，也不提供真实认证。硬件相关模式有演示说明。
- 摄像头校准进入“等待行驶”状态，不伪造完成；胎压标记为示例读数。保养内容为建议，不伪造保养历史。
- 屏幕清洁模式覆盖整个原型并屏蔽操作，支持按钮和 Escape 退出；弹窗具有键盘焦点管理。
