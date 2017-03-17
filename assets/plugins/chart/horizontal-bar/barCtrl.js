wapDirectives.register.controller('barCtrl', ['$scope', '$modalInstance', '$rootScope', 'params', 'results',
function ($scope, $modalInstance, $rootScope, params, results) {

    $scope.isDisabled = true;
    $scope.isTimeDisabled = (params.operate && params.operate == "UPDATE");
    $scope.ObjectName = params.name ? params.name : "";
    $scope.StatusTime = params.time ? new Date(params.time) : (new Date()).toDateString();
    $scope.StatusValue = params.value;
    $scope.isActive = function (status) {
          return ($scope.StatusValue == status);
    }

    // 日期时间选择框配置
    $scope.datetimepickerOptions = {
        clearBtn: false,
        format: 'yyyy-mm-dd hh:ii',
        language: 'zh-CN',
        weekStart: 1,
        todayBtn: false,
        autoclose: true,
        todayHighlight: 1,
        startView: 0,
        forceParse: 0,
        showMeridian: 1
    };

    $scope.save = function () {
        if ($scope.$$childTail.barForm.$invalid)
            return;
        
        var t = window.document.getElementById("txtTime").value;
        if (params.type == "CSP") {
            if (window.document.getElementsByName("txtClose")[0].checked)
                v = 0;
            else
                v = 1;
            
        }
        else if (params.type == "RSP") {
            v = parseFloat(window.document.getElementsByName("txtRSP")[0].value);
        }
        else if (params.type == "PRESSURE") {
            v = parseFloat(window.document.getElementsByName("txtPressure")[0].value);
        }
        else {
            return;
        }
        results.data = [{ t: t, v: v }];
        $scope.$close();
    };

    $scope.cancel = function () {
        $scope.$dismiss();
    };

    // 控制显示的设置内容（定速泵、调速泵、压力等）
    $scope.isShow = function (type) {
        return (params.type == type);
    };

    // 用于判断Form项是否包含非法值
    $scope.isInvalid = function (name, error) {

        var result = $scope.$$childTail.barForm[name].$dirty &&
                     $scope.$$childTail.barForm[name].$invalid;

        // 如果定义了error参数，则需要判断错误类型
        if (angular.isDefined(error)) {
            var err = $scope.$$childTail.barForm[name].$error;
            if (angular.isDefined(err)) {
                result = result && err[error];
            }
        }

        return result;
    };
}
]);